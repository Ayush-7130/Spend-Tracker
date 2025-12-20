/**
 * MFA Disable API Route
 * Disables two-factor authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { verifyPassword } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { ObjectId } from "mongodb";

// POST: Disable MFA (requires password confirmation)
const handleMFADisable = createApiRoute({
  methods: ["POST"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const body = await request.json();
      const { password } = body;

      if (!password) {
        return NextResponse.json(
          { success: false, error: "Password is required to disable MFA" },
          { status: 400 }
        );
      }

      // SECURITY: Check if session has been active for at least 24 hours
      // This prevents immediate malicious MFA disabling from newly compromised accounts
      const token = request.cookies.get("refreshToken")?.value;
      const { checkSessionAge } = await import("@/lib/auth");
      const sessionAgeCheck = await checkSessionAge(user.id, token, 24);

      if (!sessionAgeCheck.isValid) {
        return NextResponse.json(
          {
            success: false,
            error: `Cannot disable MFA: ${sessionAgeCheck.message}`,
            sessionAge: sessionAgeCheck.sessionAge,
            requiredAge: sessionAgeCheck.requiredAge,
          } as any,
          { status: 403 } // Forbidden
        );
      }

      const db = await dbManager.getDatabase();

      // Get user from database
      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(user.id),
      });

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Check if MFA is enabled
      if (!userDoc.mfaEnabled) {
        return NextResponse.json(
          { success: false, error: "MFA is not enabled" },
          { status: 400 }
        );
      }

      // Verify password
      const isPasswordValid = await verifyPassword(
        password,
        userDoc.passwordHash
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          { success: false, error: "Invalid password" },
          { status: 401 }
        );
      }

      // Disable MFA and clear secrets
      await db.collection("users").updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            mfaEnabled: false,
            updatedAt: new Date(),
          },
          $unset: {
            mfaSecret: "",
            mfaBackupCodes: "",
          },
        }
      );

      // SECURITY: Revoke all other sessions when MFA is disabled
      // This ensures that if someone disabled MFA maliciously, other sessions are terminated
      const { revokeAllSessions } = await import("@/lib/auth");
      const sessionsRevoked = await revokeAllSessions(user.id, "mfa_disabled");

      // Send notification
      await notificationService.notifyMFADisabled(user.id);

      // Log security event
      await db.collection("securityLogs").insertOne({
        userId: user.id,
        eventType: "mfa_disabled",
        description: "Two-factor authentication disabled",
        metadata: {
          sessionsRevoked,
        },
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: `Two-factor authentication has been disabled. ${sessionsRevoked} session(s) logged out for security.`,
        data: {
          sessionsRevoked,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to disable MFA" },
        { status: 500 }
      );
    }
  },
});

export async function POST(request: NextRequest) {
  return handleMFADisable(request);
}
