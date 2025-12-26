/**
 * User Registration (Signup) API Route
 *
 * Creates new user accounts with secure password hashing and session creation.
 *
 * Security features:
 * - Rate limiting: 5 signups per hour per IP (prevents abuse)
 * - Feature flag: Can be disabled via NEXT_PUBLIC_ENABLE_SIGNUP
 * - Strong password validation: 8+ chars, mixed case, numbers required
 * - bcrypt hashing: 12 rounds for password storage
 * - Email verification: Token-based system with 24-hour expiry
 * - Automatic session creation: Fixed 1-day expiry for new signups
 * - Device tracking: Session includes device info for security monitoring
 *
 * Session Management:
 * - New users get 1-day fixed session (Remember Me not offered during signup)
 * - Session expires exactly 24 hours after registration
 * - User must login again after 24 hours to set Remember Me preference
 *
 * @route POST /api/auth/signup
 * @access Public (if enabled via feature flag)
 */

import { NextRequest, NextResponse } from "next/server";
import { hashPassword, generateRefreshToken, isValidEmail } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import {
  RateLimiter,
  isValidPassword,
  generateSecureToken,
} from "@/lib/utils/security";
import {
  parseUserAgent,
  getLocationFromIp,
  getIpAddress,
} from "@/lib/device-info";

// Prevent signup abuse: 5 attempts per hour per IP address
// Stricter than login because signups have higher abuse potential
const signupRateLimiter = new RateLimiter(5, 60 * 60 * 1000);
export async function POST(request: NextRequest) {
  try {
    // Feature flag check: Allow admins to disable new registrations
    // Useful for private/invite-only deployments or emergency lockdown
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

    // Rate limiting by IP address to prevent automated account creation
    // Attackers often create bulk accounts for spam or abuse
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
    // INPUT VALIDATION
    // Comprehensive validation prevents malformed data and improves UX
    // ========================================================================

    const errors: Record<string, string> = {};

    // Validate name: Required for personalization and identification
    if (!name || !name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    } else if (name.trim().length > 50) {
      errors.name = "Name must not exceed 50 characters";
    }

    // Validate email: Must be valid format and reasonable length
    if (!email || !email.trim()) {
      errors.email = "Email is required";
    } else if (!isValidEmail(email)) {
      errors.email = "Please enter a valid email address";
    } else if (email.length > 255) {
      errors.email = "Email must not exceed 255 characters";
    }

    // Validate password: Enforce strong password policy
    // Security: Weak passwords are the #1 cause of account compromise
    if (!password) {
      errors.password = "Password is required";
    } else {
      const passwordValidation = isValidPassword(password);
      if (!passwordValidation.valid) {
        errors.password = passwordValidation.errors[0]; // Show first error only (better UX)
      }
    }

    // Validate password confirmation: Prevents typos
    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match";
    }

    // Return all validation errors at once for better UX
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
    // DUPLICATE ACCOUNT CHECK
    // Prevents multiple accounts with same email (security + UX)
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
        { status: 409 } // 409 Conflict
      );
    }

    // ========================================================================
    // CREATE USER ACCOUNT
    // ========================================================================

    // Hash password with bcrypt (12 rounds)
    // Hashing prevents plaintext storage and provides one-way encryption
    const passwordHash = await hashPassword(password);

    // Generate email verification token for account activation
    // 32-byte cryptographically secure random token
    const emailVerificationToken = generateSecureToken(32);
    const emailVerificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours validity

    // Get database connection
    const db = await dbManager.getDatabase();
    const now = new Date();

    // Build user document with secure defaults
    // All users start as 'user' role (not admin) for security
    const userDoc = {
      name: name.trim(),
      email: email.toLowerCase().trim(), // Lowercase for case-insensitive lookups
      passwordHash,

      // Email verification: Required before full account access
      isEmailVerified: false,
      emailVerificationToken,
      emailVerificationExpiry,

      // Account status: Active by default, can be deactivated by admins
      isActive: true,
      accountLocked: false,

      // Role-based access control: All signups start as 'user'
      role: "user" as const,

      // MFA: Disabled by default, user can enable in settings
      mfaEnabled: false,

      // Login security: Track failed attempts for account lockout
      failedLoginAttempts: 0,
      loginHistory: [],

      // Audit timestamps
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(userDoc);
    const userId = result.insertedId.toString();

    // ========================================================================
    // SESSION CREATION WITH FIXED EXPIRY
    // ========================================================================

    // Generate JWT token with 1-day FIXED expiry (Remember Me not offered during signup)
    // WHY: New users should complete email verification and explore the app first
    // They can choose longer sessions (7 days) during subsequent logins
    const rememberMe = false;
    const tokenInfo = generateRefreshToken(
      {
        userId,
        email: userDoc.email,
        role: userDoc.role,
      },
      rememberMe
    );

    // Collect device and location information for security tracking
    // Helps users identify unfamiliar devices in active sessions list
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);

    // Get client IP address for display in session management
    // IP stored for display only, not used for enforcement (privacy-focused)
    const ipAddress = getIpAddress(request.headers);

    // Geo-location lookup for security context (non-blocking)
    const location = await getLocationFromIp(ipAddress);

    // Create session with FIXED 1-day expiry
    // CRITICAL: expiresAt is set ONCE and NEVER modified
    // This implements the fixed expiry model (no sliding sessions)
    const sessionExpiresAt = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000); // 1 day from now

    await db.collection("sessions").insertOne({
      userId,
      token: tokenInfo.token,
      deviceInfo,
      ipAddress, // Stored for display in user's active sessions
      location,
      isActive: true,
      rememberMe: false, // New signups always get 1-day sessions
      expiresAt: sessionExpiresAt, // FIXED expiry - NEVER updated
      originalExpiresAt: sessionExpiresAt, // Backup for validation/migration
      createdAt: now,
      lastActivityAt: now, // Tracked for analytics only, NOT expiry
    });

    // Log the signup in login history
    await db.collection("loginHistory").insertOne({
      userId,
      email: userDoc.email,
      success: true,
      ipAddress,
      deviceInfo,
      location,
      timestamp: now,
    });

    // ========================================================================
    // PREPARE RESPONSE
    // ========================================================================

    // Remove sensitive fields from response
    // Never send password hashes or verification tokens to client
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
          token: tokenInfo.token,
          expiresAt: tokenInfo.expiresAt,
        },
      },
      { status: 201 }
    );

    // Set authentication cookie with 1-day expiry matching session
    // Cookie persistence must match token expiry for proper session lifecycle
    const cookieMaxAge = 1 * 24 * 60 * 60; // 1 day in seconds

    // Remove legacy cookie from old authentication system
    response.cookies.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Set authentication cookie (named refreshToken for backwards compatibility)
    // HttpOnly prevents JavaScript access (XSS protection)
    // Secure flag ensures HTTPS-only transmission in production
    response.cookies.set("refreshToken", tokenInfo.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    // Email verification implementation
    // NOTE: Email sending is configured via RESEND_API_KEY and EMAIL_FROM
    // The sendVerificationEmail function is available in src/lib/email/index.ts
    // Uncomment when email service is configured:
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
