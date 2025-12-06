/**
 * Forgot Password API Route
 * Sends password reset email with token
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, generateRandomToken, hashToken } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { sendPasswordResetEmail } from "@/lib/email";
import { RateLimiter } from "@/lib/utils/security";

// Rate limiter: 3 requests per hour per IP
const forgotPasswordRateLimiter = new RateLimiter(3, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!forgotPasswordRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many password reset requests. Please try again later.",
        },
        {
          status: 429,
          headers: { "Retry-After": "3600" },
        }
      );
    }

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const db = await dbManager.getDatabase();
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json(
        {
          success: true,
          message:
            "If an account exists with this email, you will receive a password reset link shortly.",
        },
        { status: 200 }
      );
    }

    // Generate reset token
    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    // Save token to user
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          passwordResetToken: hashedToken,
          passwordResetExpiry: tokenExpiry,
          updatedAt: new Date(),
        },
      }
    );

    // Send reset email (non-blocking)
    sendPasswordResetEmail(user.email, user.name, resetToken)
      .then((success) => {
        if (success) {
          console.log(`Password reset email sent to ${user.email}`);
        } else {
          console.error(`Failed to send password reset email to ${user.email}`);
        }
      })
      .catch((error) => {
        console.error("Error sending password reset email:", error);
      });

    return NextResponse.json(
      {
        success: true,
        message:
          "If an account exists with this email, you will receive a password reset link shortly.",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred processing your request" },
      { status: 500 }
    );
  }
}
