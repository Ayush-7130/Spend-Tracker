/**
 * MFA Verify API Route
 * Verifies MFA token and enables 2FA
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { verifyMFAToken } from "@/lib/mfa";
import { notificationService } from "@/lib/notifications";
import { ObjectId } from "mongodb";

// POST: Verify MFA token and enable 2FA
const handleMFAVerify = createApiRoute({
  methods: ["POST"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const body = await request.json();
      const { token } = body;

      if (!token) {
        return NextResponse.json(
          { success: false, error: "Verification token is required" },
          { status: 400 }
        );
      }

      if (!/^\d{6}$/.test(token)) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid token format. Please enter a 6-digit code.",
          },
          { status: 400 }
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

      // Check if user has a secret set up
      if (!userDoc.mfaSecret) {
        return NextResponse.json(
          {
            success: false,
            error: "MFA not set up. Please initiate setup first.",
          },
          { status: 400 }
        );
      }

      // Check if MFA is already enabled
      if (userDoc.mfaEnabled) {
        return NextResponse.json(
          { success: false, error: "MFA is already enabled" },
          { status: 400 }
        );
      }

      // Verify the token
      const isValid = verifyMFAToken(token, userDoc.mfaSecret);

      if (!isValid) {
        return NextResponse.json(
          {
            success: false,
            error: "Invalid verification code. Please try again.",
          },
          { status: 401 }
        );
      }

      // Enable MFA
      await db.collection("users").updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            mfaEnabled: true,
            updatedAt: new Date(),
          },
        }
      );

      // Send notification
      await notificationService.notifyMFAEnabled(user.id);

      // Log security event
      await db.collection("securityLogs").insertOne({
        userId: user.id,
        eventType: "mfa_enabled",
        description: "Two-factor authentication enabled",
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Two-factor authentication has been enabled successfully!",
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to verify MFA token" },
        { status: 500 }
      );
    }
  },
});

export async function POST(request: NextRequest) {
  return handleMFAVerify(request);
}
