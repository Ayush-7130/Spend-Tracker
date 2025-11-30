/**
 * Change Password API Route
 *
 * Handles user password changes with validation.
 *
 * POST: Change user password
 * - Requires current password
 * - Validates new password strength
 * - Ensures new password confirmation matches
 */

import { NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { createApiRoute } from "@/lib/api-middleware";
import { verifyPassword, hashPassword, isValidPassword } from "@/lib/auth";

// POST: Change user password
const handleChangePassword = createApiRoute({
  methods: ["POST"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const body = await request.json();
      const { currentPassword, newPassword, confirmPassword } = body;

      // Validation
      const errors: Record<string, string> = {};

      if (!currentPassword) {
        errors.currentPassword = "Current password is required";
      }

      if (!newPassword) {
        errors.newPassword = "New password is required";
      } else {
        // Validate new password strength
        const passwordValidation = isValidPassword(newPassword);
        if (!passwordValidation.valid) {
          errors.newPassword = passwordValidation.message || "Invalid password";
        }
      }

      if (!confirmPassword) {
        errors.confirmPassword = "Password confirmation is required";
      } else if (newPassword && confirmPassword !== newPassword) {
        errors.confirmPassword = "Passwords do not match";
      }

      // Check if new password is same as current
      if (currentPassword && newPassword && currentPassword === newPassword) {
        errors.newPassword =
          "New password must be different from current password";
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ success: false, errors }, { status: 400 });
      }

      // Fetch user from database
      const userDoc = await dbManager.getUserByEmail(user.email);

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // Verify current password
      const isPasswordValid = await verifyPassword(
        currentPassword,
        userDoc.passwordHash
      );

      if (!isPasswordValid) {
        return NextResponse.json(
          {
            success: false,
            errors: { currentPassword: "Current password is incorrect" },
          },
          { status: 400 }
        );
      }

      // Hash new password
      const newPasswordHash = await hashPassword(newPassword);

      // Update password in database
      const db = await dbManager.getDatabase();
      await db.collection("users").updateOne(
        { email: user.email },
        {
          $set: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );

      // Revoke ALL active sessions (force re-login everywhere)
      await db
        .collection("sessions")
        .updateMany(
          { userId: user.id, isActive: true },
          { $set: { isActive: false } }
        );

      // Get device info for notification
      const userAgent = request.headers.get("user-agent") || "Unknown";
      const { parseUserAgent, getIpAddress } =
        await import("@/lib/device-info");
      const deviceInfo = parseUserAgent(userAgent);
      const ipAddress = getIpAddress(request.headers);
      const deviceDescription = `${deviceInfo.browser} on ${deviceInfo.os}`;

      // Send in-app notification
      const { notificationService } = await import("@/lib/notifications");
      await notificationService.notifyPasswordChanged(
        user.id,
        deviceDescription,
        ipAddress
      );

      // Log security event
      await db.collection("securityLogs").insertOne({
        userId: user.id,
        eventType: "password_change",
        description: "Password was changed by user",
        ipAddress,
        metadata: { deviceInfo },
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message:
          "Password changed successfully. All sessions have been logged out for security.",
      });
    } catch (error: any) {
      return NextResponse.json(
        { success: false, error: "Failed to change password" },
        { status: 500 }
      );
    }
  },
});

// Export route handler
export const POST = handleChangePassword;
