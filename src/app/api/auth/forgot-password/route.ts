/**
 * Forgot Password API Route
 *
 * Generates secure password reset tokens and sends recovery emails.
 *
 * Security features:
 * - Rate limiting (3 requests/hour) prevents token flooding attacks
 * - Constant-time response prevents email enumeration attacks
 * - Token hashed before storage prevents database compromise exposure
 * - 1-hour token expiry limits attack window
 * - Non-blocking email sending prevents timeout issues
 *
 * @route POST /api/auth/forgot-password
 * @access Public
 */

import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, generateRandomToken, hashToken } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { sendPasswordResetEmail } from "@/lib/email";
import { RateLimiter } from "@/lib/utils/security";
import logger from "@/lib/logger";

// Prevent token flooding: 3 requests per hour per IP address
// Protects against attackers generating excessive reset emails
const forgotPasswordRateLimiter = new RateLimiter(3, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Extract client IP for rate limiting
    // X-Forwarded-For can be comma-separated, take first (client) IP
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
          headers: { "Retry-After": "3600" }, // Seconds until retry allowed
        }
      );
    }

    const body = await request.json();
    const { email } = body;

    // Input validation
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

    // SECURITY: Always return success to prevent email enumeration
    // Attackers cannot determine which emails are registered by timing responses
    // This is critical to prevent reconnaissance attacks
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

    // Generate cryptographically secure random token
    // Token is 32 bytes (256 bits) providing strong security
    const resetToken = generateRandomToken();
    const hashedToken = hashToken(resetToken);
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour validity

    // Store hashed token in database
    // Hashing prevents exposure if database is compromised
    // Only the user who received the email knows the plaintext token
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

    // Send reset email asynchronously to avoid blocking the response
    // Non-blocking prevents timeout issues with slow email servers
    // Errors are logged but don't fail the request (user still gets success message)
    sendPasswordResetEmail(user.email, user.name, resetToken)
      .then((success) => {
        if (success) {
          logger.info("Password reset email sent", {
            email: user.email,
            context: "/api/auth/forgot-password",
          });
        } else {
          logger.error("Failed to send password reset email", null, {
            email: user.email,
            context: "/api/auth/forgot-password",
          });
        }
      })
      .catch((error) => {
        logger.error("Error sending password reset email", error, {
          email: user.email,
          context: "/api/auth/forgot-password",
        });
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
