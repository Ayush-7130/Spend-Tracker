/**
 * POST /api/auth/reset-password
 *
 * Resets user password using token from forgot-password email.
 *
 * SECURITY: Rate limited to prevent brute force token guessing attacks.
 * All existing sessions are revoked after successful password reset,
 * forcing user to log in again with new password.
 *
 * Rate limit: 3 attempts per hour per IP
 *
 * @body { token, newPassword }
 * @returns { success: true } on successful password reset
 * @returns { error } with 400 for invalid/expired token or weak password
 * @returns { error } with 429 if rate limit exceeded
 */

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, hashToken, isValidPassword } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { notificationService } from "@/lib/notifications";
import { parseUserAgent, getIpAddress } from "@/lib/device-info";
import { RateLimiter } from "@/lib/utils/security";

// Rate limiter: 3 password reset attempts per hour per IP
// Prevents brute force attacks on reset tokens
const resetPasswordRateLimiter = new RateLimiter(3, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Extract client IP for rate limiting
    const clientIp = getIpAddress(request.headers);

    // Rate limiting: Prevent brute force token guessing
    if (!resetPasswordRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Too many password reset attempts. Please try again in an hour.",
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" }, // 1 hour
        }
      );
    }

    const body = await request.json();
    const { token, newPassword } = body;

    // Validation
    if (!token || !newPassword) {
      return NextResponse.json(
        { success: false, error: "Token and new password are required" },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(newPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = hashToken(token);

    // Find user with this reset token
    const db = await dbManager.getDatabase();
    const user = await db.collection("users").findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const userId = user._id.toString();

    // Hash new password
    const newPasswordHash = await hashPassword(newPassword);

    // Update user password and clear reset token
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: newPasswordHash,
          passwordChangedAt: new Date(),
          failedLoginAttempts: 0, // Reset failed attempts
          accountLocked: false, // Unlock account if locked
          updatedAt: new Date(),
        },
        $unset: {
          passwordResetToken: "",
          passwordResetExpiry: "",
          lockedUntil: "",
          lockReason: "",
        },
      }
    );

    // Revoke all active sessions (force re-login)
    await db
      .collection("sessions")
      .updateMany({ userId, isActive: true }, { $set: { isActive: false } });

    // Get device info for notification
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);
    const ipAddress = getIpAddress(request.headers);
    const deviceDescription = `${deviceInfo.browser} on ${deviceInfo.os}`;

    // Send notification about password reset
    await notificationService.notifyPasswordReset(
      userId,
      deviceDescription,
      ipAddress
    );

    // Log security event
    await db.collection("securityLogs").insertOne({
      userId,
      eventType: "password_reset",
      description: "Password was reset via email link",
      ipAddress,
      metadata: { deviceInfo },
      timestamp: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Password has been reset successfully. All active sessions have been logged out. Please login with your new password.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred while resetting password" },
      { status: 500 }
    );
  }
}

// GET endpoint to validate reset token
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);
    const db = await dbManager.getDatabase();

    const user = await db.collection("users").findOne({
      passwordResetToken: hashedToken,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, valid: false, message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        email: user.email,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
