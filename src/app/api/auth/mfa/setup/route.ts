/**
 * MFA Setup API Route
 * Generates QR code and backup codes for 2FA setup
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { generateMFASecret } from "@/lib/mfa";
import { ObjectId } from "mongodb";

// POST: Generate MFA secret and QR code
const handleMFASetup = createApiRoute({
  methods: ["POST"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
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

      // Check if MFA is already enabled
      if (userDoc.mfaEnabled) {
        return NextResponse.json(
          {
            success: false,
            error:
              "MFA is already enabled. Please disable it first to reconfigure.",
          },
          { status: 400 }
        );
      }

      // Generate MFA secret and backup codes
      const mfaSetup = await generateMFASecret(userDoc.email, "Spend Tracker");

      // Store the secret temporarily (not enabled yet, needs verification)
      await db.collection("users").updateOne(
        { _id: new ObjectId(user.id) },
        {
          $set: {
            mfaSecret: mfaSetup.secret,
            mfaBackupCodes: mfaSetup.backupCodes,
            updatedAt: new Date(),
          },
        }
      );

      // Generate display-friendly backup codes (not hashed)
      const { formatBackupCodesForDisplay } = await import("@/lib/mfa");
      const displayBackupCodes = formatBackupCodesForDisplay(10);

      return NextResponse.json({
        success: true,
        message:
          "MFA setup initiated. Scan the QR code with your authenticator app.",
        data: {
          qrCode: mfaSetup.qrCode,
          secret: mfaSetup.secret, // Show secret for manual entry
          backupCodes: displayBackupCodes, // Display codes for user to save
        },
      });
    } catch (error) {      return NextResponse.json(
        { success: false, error: "Failed to generate MFA setup" },
        { status: 500 }
      );
    }
  },
});

// GET: Check MFA status
const handleGetMFAStatus = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const db = await dbManager.getDatabase();

      const userDoc = await db.collection("users").findOne({
        _id: new ObjectId(user.id),
      });

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          mfaEnabled: userDoc.mfaEnabled || false,
          hasSecret: !!userDoc.mfaSecret,
          backupCodesCount: userDoc.mfaBackupCodes?.length || 0,
        },
      });
    } catch (error) {      return NextResponse.json(
        { success: false, error: "Failed to get MFA status" },
        { status: 500 }
      );
    }
  },
});

export async function POST(request: NextRequest) {
  return handleMFASetup(request);
}

export async function GET(request: NextRequest) {
  return handleGetMFAStatus(request);
}
