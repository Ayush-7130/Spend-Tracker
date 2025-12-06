import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateTokenPair, isValidEmail } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import {
  RateLimiter,
  isValidPassword,
  generateSecureToken,
} from "@/lib/utils/security";
import { parseUserAgent } from "@/lib/device-info";

// Rate limiter: 5 signup attempts per hour per IP
const signupRateLimiter = new RateLimiter(5, 60 * 60 * 1000);

/**
 * POST /api/auth/signup
 * Register a new user account
 */
export async function POST(request: NextRequest) {
  try {
    // Check if signup is enabled
    const signupEnabled = process.env.NEXT_PUBLIC_ENABLE_SIGNUP === "true";
    if (!signupEnabled) {
      return NextResponse.json(
        {
          success: false,
          error: "Sign-up functionality is currently disabled",
        },
        { status: 403 }
      );
    }

    // Rate limiting by IP address
    const clientIp =
      request.headers.get("x-forwarded-for") ||
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
            "Retry-After": "3600", // 1 hour in seconds
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, email, password, confirmPassword } = body;

    // ========================================================================
    // VALIDATION
    // ========================================================================

    const errors: Record<string, string> = {};

    // Validate name
    if (!name || !name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      errors.name = "Name must not exceed 50 characters";
    }

    // Validate email
    if (!email || !email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email address";
    } else if (email.length > 255) {
      errors.email = "Email must not exceed 255 characters";
    }

    // Validate password
    if (!password) {
      errors.password = "Password is required";
    } else {
      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.errors[0]; // Show first error
      }
    }

    // Validate confirm password
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Return validation errors if any
    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          errors,
        },
        { status: 400 }
      );
    }

    // ========================================================================
    // CHECK FOR EXISTING USER
    // ========================================================================

    const existingUser = await dbManager.getUserByEmail(
      email.toLowerCase().trim()
    );
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "An account with this email already exists",
          errors: { email: "This email is already registered" },
        },
        { status: 409 }
      );
    }

    // ========================================================================
    // CREATE USER
    // ========================================================================

    // Hash password
    const passwordHash = await hashPassword(password);

    // Generate email verification token
    const emailVerificationToken = generateSecureToken(32);
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Get database connection
    const db = await dbManager.getDatabase();
    const now = new Date();

    // Create user document
    const userDoc = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,

      // Email verification
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry,

      // Account status
      isActive: true,
      accountLocked: false,

      // Role
      role: "user" as const,

      // MFA
      mfaEnabled: false,

      // Login tracking
      failedLoginAttempts: 0,
      loginHistory: [],

      // Timestamps
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(userDoc);
    const userId = result.insertedId.toString();

    // ========================================================================
    // GENERATE TOKENS AND CREATE SESSION
    // ========================================================================

    // Generate token pair (default 15min access, 7 days refresh)
    const tokenPair = generateTokenPair(
      {
        userId,
        email: userDoc.email,
        role: userDoc.role,
      },
      false // rememberMe is false for new signups
    );

    // Get device info
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);

    // Create session in database
    const sessionExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await db.collection("sessions").insertOne({
      userId,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      deviceInfo,
      location: {
        ip: clientIp,
      },
      isActive: true,
      rememberMe: false,
      expiresAt: sessionExpiresAt,
      createdAt: now,
      lastActivityAt: now,
    });

    // Log the signup in login history
    await db.collection("loginHistory").insertOne({
      userId,
      email: userDoc.email,
      success: true,
      deviceInfo,
      location: {
        ip: clientIp,
      },
      timestamp: now,
    });

    // ========================================================================
    // PREPARE RESPONSE
    // ========================================================================

    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      passwordHash: _,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      emailVerificationToken: __,
      ...userResponse
    } = userDoc;

    const response = NextResponse.json(
      {
        success: true,
        message: "Account created successfully",
        data: {
          user: {
            _id: userId,
            ...userResponse,
          },
          accessToken: tokenPair.accessToken,
          expiresAt: tokenPair.accessTokenExpiresAt,
        },
      },
      { status: 201 }
    );

    // Set cookies (7 days for new signups)
    const cookieMaxAge = 7 * 24 * 60 * 60; // 7 days in seconds

    response.cookies.set("accessToken", tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    response.cookies.set("refreshToken", tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    // TODO: Send verification email
    // This can be implemented later using the email service at src/lib/email/index.ts
    // await sendVerificationEmail(userDoc.email, emailVerificationToken);

    return response;
  } catch (error) {
    // Handle specific MongoDB errors
    if (error instanceof Error) {
      const errorMessage = error.message;

      // Check for MongoDB connection errors
      if (
        errorMessage.includes("ETIMEDOUT") ||
        errorMessage.includes("MongoServerSelectionError")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Database connection error. Please try again in a moment.",
          },
          { status: 503 }
        );
      }

      // Check for duplicate key error (race condition)
      if (errorMessage.includes("E11000") && errorMessage.includes("email")) {
        return NextResponse.json(
          {
            success: false,
            error: "An account with this email already exists",
            errors: { email: "This email is already registered" },
          },
          { status: 409 }
        );
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        success: false,
        error: "Server error. Please try again later.",
      },
      { status: 500 }
    );
  }
}
