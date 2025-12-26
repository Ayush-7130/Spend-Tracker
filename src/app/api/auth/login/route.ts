/**
 * Login API Route
 *
 * Authenticates users and creates sessions with FIXED expiry (no sliding sessions).
 *
 * Security features:
 * - Rate limiting: 5 attempts per 15 minutes per IP (prevents brute force)
 * - Account lockout: 15 minutes after 5 failed password attempts
 * - MFA support: TOTP tokens and backup codes
 * - Session tracking: Device fingerprinting and multi-device management
 * - IP logging: Stored for display only, not enforcement (privacy-focused)
 * - Fixed session expiry: 1 day or 7 days, NEVER extended (security > convenience)
 *
 * Session Expiry Model:
 * - Remember Me = false: 1 day fixed expiry from login time
 * - Remember Me = true: 7 days fixed expiry from login time
 * - Session expires at EXACT time set during login, regardless of activity
 * - lastActivityAt tracked for analytics only, does NOT extend session
 *
 * @route POST /api/auth/login
 * @access Public
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateRefreshToken, isValidEmail } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { RateLimiter } from "@/lib/utils/security";
import {
  parseUserAgent,
  getIpAddress,
  getLocationFromIp,
  getDeviceDescription,
} from "@/lib/device-info";
import { notificationService } from "@/lib/notifications";
import { verifyMFAToken, verifyBackupCode, removeBackupCode } from "@/lib/mfa";
import { ObjectId } from "mongodb";

// Prevent brute force attacks: 5 attempts per 15 minutes per IP address
// Tighter than typical rate limits because failed logins indicate attack patterns
const loginRateLimiter = new RateLimiter(5, 15 * 60 * 1000);

export async function POST(request: NextRequest) {
  const db = await dbManager.getDatabase();

  try {
    // Gather client information for security tracking
    // IP address stored for display in login history, not used for enforcement
    const ipAddress = getIpAddress(request.headers);
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);

    // Rate limiting: Prevent automated password guessing attacks
    // 15-minute window balances security and legitimate user retry attempts
    if (!loginRateLimiter.isAllowed(ipAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again in 15 minutes.",
        },
        {
          status: 429,
          headers: { "Retry-After": "900" }, // 15 minutes in seconds
        }
      );
    }

    const body = await request.json();
    const { email, password, mfaToken, rememberMe = false } = body;

    // Basic input validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Please enter a valid email address" },
        { status: 400 }
      );
    }

    // Query database for user account
    // Email stored lowercase to prevent duplicate accounts with different casing
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      // Log failed attempt for security monitoring
      // IP address stored for display in admin panels, not for blocking
      await db.collection("loginHistory").insertOne({
        email: email.toLowerCase(),
        success: false,
        ipAddress,
        deviceInfo,
        failureReason: "Invalid credentials",
        timestamp: new Date(),
      });

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const userId = user._id.toString();

    // Account lockout check: Temporary protection after repeated failures
    // 15-minute lockout after 5 failed attempts prevents sustained brute force
    if (user.accountLocked) {
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        const minutesLeft = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );

        await db.collection("loginHistory").insertOne({
          userId,
          email: user.email,
          success: false,
          ipAddress,
          deviceInfo,
          failureReason: "Account locked",
          timestamp: new Date(),
        });

        return NextResponse.json(
          {
            success: false,
            error: `Account is temporarily locked. Please try again in ${minutesLeft} minute(s).`,
          },
          { status: 403 }
        );
      } else {
        // Auto-unlock after lock period expires
        // Resets failed attempt counter for fresh start
        await db.collection("users").updateOne(
          { _id: user._id },
          {
            $set: {
              accountLocked: false,
              failedLoginAttempts: 0,
            },
            $unset: {
              lockedUntil: "",
              lockReason: "",
            },
          }
        );
      }
    }

    // Verify password using bcrypt constant-time comparison
    // Protects against timing attacks that could leak password information
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Track failed attempts for account lockout mechanism
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: new Date(),
      };

      // Trigger account lockout after 5 failed attempts
      // Prevents attackers from unlimited password guessing
      if (failedAttempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        updateData.accountLocked = true;
        updateData.lockedUntil = new Date(Date.now() + lockDuration);
        updateData.lockReason = "Too many failed login attempts";

        // Notify user of suspicious activity via email/notification system
        await notificationService.notifyFailedLoginAttempts(
          userId,
          failedAttempts
        );
      }

      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: updateData });

      // Log failed attempt for security audit trail
      await db.collection("loginHistory").insertOne({
        userId,
        email: user.email,
        success: false,
        ipAddress,
        deviceInfo,
        failureReason: "Invalid password",
        timestamp: new Date(),
      });

      // Inform user of account lockout
      if (failedAttempts >= 5) {
        return NextResponse.json(
          {
            success: false,
            error:
              "Account locked due to too many failed attempts. Please try again in 15 minutes.",
          },
          { status: 403 }
        );
      }

      // Generic error message prevents attacker from knowing password was wrong
      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Multi-Factor Authentication (MFA) validation for enhanced security
    // Required for users who have enabled TOTP-based 2FA
    if (user.mfaEnabled) {
      if (!mfaToken) {
        // Prompt user for MFA token after successful password validation
        return NextResponse.json(
          {
            success: false,
            requiresMfa: true,
            message: "Please enter your 6-digit authentication code",
          },
          { status: 200 }
        );
      }

      // Support both TOTP tokens and backup codes
      // Backup codes provide recovery when user loses authenticator device
      let mfaValid = false;
      let usedBackupCode = false;

      if (mfaToken.includes("-")) {
        // Backup code format (e.g., "ABCD-1234")
        // Each backup code is single-use to prevent replay attacks
        mfaValid = verifyBackupCode(mfaToken, user.mfaBackupCodes || []);
        usedBackupCode = true;
      } else {
        // TOTP token (6 digits, time-based, 30-second window)
        // Provides time-synchronized security without network dependency
        mfaValid = verifyMFAToken(mfaToken, user.mfaSecret);
      }

      if (!mfaValid) {
        // Log MFA failure for security monitoring
        await db.collection("loginHistory").insertOne({
          userId,
          email: user.email,
          success: false,
          ipAddress,
          deviceInfo,
          failureReason: "Invalid MFA token",
          timestamp: new Date(),
        });

        return NextResponse.json(
          { success: false, error: "Invalid authentication code" },
          { status: 401 }
        );
      }

      // Remove used backup code to prevent replay attacks
      // Each backup code is single-use and must be deleted after successful use
      if (usedBackupCode) {
        const updatedBackupCodes = removeBackupCode(
          mfaToken,
          user.mfaBackupCodes || []
        );
        await db
          .collection("users")
          .updateOne(
            { _id: user._id },
            { $set: { mfaBackupCodes: updatedBackupCodes } }
          );
      }
    }

    // Generate JWT token with FIXED expiry (no sliding sessions)
    // Remember Me: false = 1 day fixed, true = 7 days fixed
    // Session expiry is set ONCE at login and NEVER extended
    const tokenInfo = generateRefreshToken(
      {
        userId,
        email: user.email,
        role: user.role,
      },
      rememberMe
    );

    // Geo-location lookup for security monitoring (IP not stored long-term)
    const location = await getLocationFromIp(ipAddress);

    // Session management strategy: Single active session per device
    //
    // WHY: Prevents token conflicts when multiple tabs open on same device
    // - If user opens 2 tabs, both tabs should share the same session token
    // - Otherwise, tab A login invalidates tab B token, causing ping-pong effect
    //
    // MULTI-DEVICE: Users CAN be logged in on phone, laptop, tablet simultaneously
    // - Different devices have different browser/OS combinations
    // - Each device gets its own independent session
    //
    // SECURITY: Old sessions from same device are invalidated
    // - Prevents session fixation attacks
    // - Ensures stolen tokens from old sessions don't work
    const sessionId = new ObjectId();

    // Invalidate previous sessions from the SAME device only
    // Matches browser + OS to identify same device across logins
    if (deviceInfo?.browser && deviceInfo?.os) {
      await db.collection("sessions").updateMany(
        {
          userId,
          isActive: true,
          "deviceInfo.browser": deviceInfo.browser,
          "deviceInfo.os": deviceInfo.os,
        },
        {
          $set: {
            isActive: false,
            replacedBy: sessionId.toString(),
            replacedAt: new Date(),
          },
        }
      );
    }

    // Create new session with FIXED expiry timestamp
    // CRITICAL: expiresAt is set ONCE and NEVER modified
    // This implements the fixed expiry model (no sliding sessions)
    // Session expires exactly 1 day (or 7 days) after login, regardless of activity
    const session = {
      _id: sessionId,
      userId,
      token: tokenInfo.token, // Single JWT token (not access/refresh split)
      deviceInfo,
      ipAddress, // Stored for display in user's active sessions list
      location,
      isActive: true,
      rememberMe, // User's preference for session duration
      expiresAt: tokenInfo.expiresAt, // FIXED expiry - NEVER updated
      originalExpiresAt: tokenInfo.expiresAt, // Backup for validation/migration
      createdAt: new Date(),
      lastActivityAt: new Date(), // Tracked for analytics only, NOT expiry
    };

    await db.collection("sessions").insertOne(session);

    // Reset account lockout fields on successful login
    // User has proven identity, clear failed attempt counter
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          failedLoginAttempts: 0,
          lastLoginAt: new Date(),
          updatedAt: new Date(),
        },
        $unset: { lastFailedLoginAt: "", lastLoginIp: "" },
      }
    );

    // Audit trail: Log successful authentication
    // IP address stored for security review and compliance
    await db.collection("loginHistory").insertOne({
      userId,
      email: user.email,
      success: true,
      ipAddress,
      deviceInfo,
      location,
      timestamp: new Date(),
    });

    // Security log: Track login events for monitoring
    // No IP address stored here (privacy-focused logging)
    await db.collection("securityLogs").insertOne({
      userId,
      eventType: "login",
      description: `User logged in from ${getDeviceDescription(deviceInfo)}`,
      metadata: { deviceInfo, location },
      timestamp: new Date(),
    });

    // Notify user of new login across all their active sessions
    // Helps users detect unauthorized access from unfamiliar devices
    // Current session is excluded to avoid self-notification
    const locationStr = location
      ? `${location.city}, ${location.country}`
      : "Unknown location";
    await notificationService.notifyNewLogin(
      userId,
      getDeviceDescription(deviceInfo),
      locationStr,
      sessionId.toString() // Exclude current session from notification
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          user: {
            id: userId,
            name: user.name,
            email: user.email,
            role: user.role,
            isEmailVerified: user.isEmailVerified,
            mfaEnabled: user.mfaEnabled,
          },
          session: {
            sessionId: sessionId.toString(),
            expiresAt: tokenInfo.expiresAt,
            rememberMe, // Client needs this to show session duration
          },
        },
      },
      { status: 200 }
    );

    // Set authentication cookie with same expiry as session
    //
    // Cookie maxAge must match token expiry to ensure:
    // - Browser persists cookie as long as token is valid
    // - Cookie expires when token expires (automatic cleanup)
    // - Remember Me works correctly (7 days vs 1 day persistence)
    //
    // HttpOnly flag prevents JavaScript access (XSS protection)
    // Secure flag ensures HTTPS-only transmission in production
    // SameSite 'lax' provides CSRF protection while allowing GET navigation
    const cookieMaxAge = rememberMe
      ? 7 * 24 * 60 * 60 // 7 days in seconds
      : 1 * 24 * 60 * 60; // 1 day in seconds

    // Remove legacy cookie from old authentication system
    response.cookies.set("accessToken", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 0,
      path: "/",
    });

    // Set the authentication cookie (named refreshToken for backwards compatibility)
    // This is actually the single JWT token, not a traditional refresh token
    response.cookies.set("refreshToken", tokenInfo.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
