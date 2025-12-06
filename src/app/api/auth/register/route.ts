/**
 * User Registration API Route
 * Handles new user signup with email verification
 */

import { NextRequest, NextResponse } from "next/server";
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  generateRandomToken,
  hashToken,
} from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { sendVerificationEmail } from "@/lib/email";
import { RateLimiter } from "@/lib/utils/security";

// Rate limiter: 3 signup attempts per hour per IP
const signupRateLimiter = new RateLimiter(3, 60 * 60 * 1000);

export async function POST(request: NextRequest) {
  try {
    // Rate limiting by IP address
    const clientIp =
      request.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (!signupRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many signup attempts. Please try again later.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": "3600",
          },
        }
      );
    }

    const body = await request.json();
    const { email, password, name } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: "Email, password, and name are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    const passwordValidation = isValidPassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { success: false, error: passwordValidation.message },
        { status: 400 }
      );
    }

    if (name.trim().length < 2) {
      return NextResponse.json(
        { success: false, error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await dbManager.getUserByEmail(email.toLowerCase());
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const verificationToken = generateRandomToken();
    const hashedToken = hashToken(verificationToken);
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user with security fields
    const db = await dbManager.getDatabase();
    const now = new Date();

    const newUser = {
      name: name.trim(),
      email: email.toLowerCase(),
      passwordHash,
      role: "user" as const,

      // Email verification
      isEmailVerified: false,
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: tokenExpiry,

      // MFA
      mfaEnabled: false,

      // Account status
      accountLocked: false,
      failedLoginAttempts: 0,

      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(newUser);
    const userId = result.insertedId.toString();

    // Send verification email (non-blocking)
    sendVerificationEmail(email, name, verificationToken).catch(() => {});

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message:
          "Account created successfully! Please check your email to verify your account.",
        data: {
          userId,
          email: email.toLowerCase(),
          name: name.trim(),
          isEmailVerified: false,
        },
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred during signup" },
      { status: 500 }
    );
  }
}
