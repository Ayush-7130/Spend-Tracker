/**
 * Login API Route
 * Handles user authentication with session tracking, device info, and MFA support
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, generateTokenPair, isValidEmail } from "@/lib/auth";
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

// Rate limiter: 5 login attempts per minute per IP
const loginRateLimiter = new RateLimiter(5, 60000);

export async function POST(request: NextRequest) {
  const db = await dbManager.getDatabase();

  try {
    // Get client information
    const ipAddress = getIpAddress(request.headers);
    const userAgent = request.headers.get("user-agent") || "Unknown";
    const deviceInfo = parseUserAgent(userAgent);

    // Rate limiting
    if (!loginRateLimiter.isAllowed(ipAddress)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many login attempts. Please try again in a minute.",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    const body = await request.json();
    const { email, password, mfaToken, rememberMe = false } = body;

    // Validation
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

    // Find user by email
    const user = await db.collection("users").findOne({
      email: email.toLowerCase(),
    });

    if (!user) {
      // Log failed login attempt (no user found) - no IP address stored
      await db.collection("loginHistory").insertOne({
        email: email.toLowerCase(),
        success: false,
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

    // Check if account is locked
    if (user.accountLocked) {
      if (user.lockedUntil && new Date() < new Date(user.lockedUntil)) {
        const minutesLeft = Math.ceil(
          (new Date(user.lockedUntil).getTime() - Date.now()) / 60000
        );

        await db.collection("loginHistory").insertOne({
          userId,
          email: user.email,
          success: false,
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
        // Unlock account if lock period has expired
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

    // Verify password
    const isPasswordValid = await verifyPassword(password, user.passwordHash);

    if (!isPasswordValid) {
      // Increment failed login attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = {
        failedLoginAttempts: failedAttempts,
        lastFailedLoginAt: new Date(),
      };

      // Lock account after 5 failed attempts
      if (failedAttempts >= 5) {
        const lockDuration = 15 * 60 * 1000; // 15 minutes
        updateData.accountLocked = true;
        updateData.lockedUntil = new Date(Date.now() + lockDuration);
        updateData.lockReason = "Too many failed login attempts";

        // Send notification about failed attempts
        await notificationService.notifyFailedLoginAttempts(
          userId,
          failedAttempts
        );
      }

      await db
        .collection("users")
        .updateOne({ _id: user._id }, { $set: updateData });

      // Log failed login (no IP address stored)
      await db.collection("loginHistory").insertOne({
        userId,
        email: user.email,
        success: false,
        deviceInfo,
        failureReason: "Invalid password",
        timestamp: new Date(),
      });

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

      return NextResponse.json(
        { success: false, error: "Invalid email or password" },
        { status: 401 }
      );
    }

    // Handle MFA if enabled
    if (user.mfaEnabled) {
      if (!mfaToken) {
        return NextResponse.json(
          {
            success: false,
            requiresMfa: true,
            message: "Please enter your 6-digit authentication code",
          },
          { status: 200 }
        );
      }

      // Verify MFA token or backup code
      let mfaValid = false;
      let usedBackupCode = false;

      if (mfaToken.includes("-")) {
        // Backup code format (e.g., "ABCD-1234")
        mfaValid = verifyBackupCode(mfaToken, user.mfaBackupCodes || []);
        usedBackupCode = true;
      } else {
        // TOTP token (6 digits)
        mfaValid = verifyMFAToken(mfaToken, user.mfaSecret);
      }

      if (!mfaValid) {
        await db.collection("loginHistory").insertOne({
          userId,
          email: user.email,
          success: false,
          deviceInfo,
          failureReason: "Invalid MFA token",
          timestamp: new Date(),
        });

        return NextResponse.json(
          { success: false, error: "Invalid authentication code" },
          { status: 401 }
        );
      }

      // Remove used backup code
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

    // Generate tokens with Remember Me support
    const tokenPair = generateTokenPair(
      {
        userId,
        email: user.email,
        role: user.role,
      },
      rememberMe
    );

    // Get location info (optional) - IP not stored in database
    const location = await getLocationFromIp(ipAddress);

    // IMPORTANT: Session management strategy
    // Auto-cleanup old sessions from THE SAME device to prevent token conflicts
    // Keep sessions from different devices/browsers active
    // This prevents multiple tabs from fighting over tokens
    const sessionId = new ObjectId();
    
    // Invalidate old sessions from the same browser/device
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

    // Create NEW session (no IP address stored)
    const session = {
      _id: sessionId,
      userId,
      accessToken: tokenPair.accessToken,
      refreshToken: tokenPair.refreshToken,
      deviceInfo,
      location,
      isActive: true,
      rememberMe, // Store Remember Me preference
      expiresAt: tokenPair.refreshTokenExpiresAt,
      createdAt: new Date(),
      lastActivityAt: new Date(),
    };

    await db.collection("sessions").insertOne(session);
    // Update user - reset failed attempts and set last login (no IP stored)
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

    // Log successful login (no IP address stored)
    await db.collection("loginHistory").insertOne({
      userId,
      email: user.email,
      success: true,
      deviceInfo,
      location,
      timestamp: new Date(),
    });

    // Log security event (no IP address stored)
    await db.collection("securityLogs").insertOne({
      userId,
      eventType: "login",
      description: `User logged in from ${getDeviceDescription(deviceInfo)}`,
      metadata: { deviceInfo, location },
      timestamp: new Date(),
    });

    // Send notification about new login to other sessions
    // Exclude the current session from receiving this notification
    const locationStr = location
      ? `${location.city}, ${location.country}`
      : "Unknown location";
    await notificationService.notifyNewLogin(
      userId,
      getDeviceDescription(deviceInfo),
      locationStr,
      sessionId.toString() // Exclude current session
    );

    // Set cookie maxAge based on Remember Me
    // IMPORTANT: Cookie maxAge should match the refresh token expiration, NOT access token
    // The access token will be refreshed automatically, so its cookie should persist
    const accessMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // Match refresh token expiration
    const refreshMaxAge = rememberMe ? 30 * 24 * 60 * 60 : 7 * 24 * 60 * 60; // 30 days or 7 days

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
            expiresAt: tokenPair.refreshTokenExpiresAt,
          },
        },
      },
      { status: 200 }
    );

    // Set cookies with appropriate expiration
    response.cookies.set("accessToken", tokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: accessMaxAge,
      path: "/",
    });

    response.cookies.set("refreshToken", tokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: refreshMaxAge,
      path: "/",
    });
    return response;
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "An error occurred during login" },
      { status: 500 }
    );
  }
}
