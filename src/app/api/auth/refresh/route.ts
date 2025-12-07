/**
 * Token Refresh API Route
 * Refreshes expired access tokens using valid refresh tokens
 */

import { NextRequest, NextResponse } from "next/server";
import { verifyRefreshToken, generateTokenPair } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    // Get refresh token from cookie first
    let refreshToken = request.cookies.get("refreshToken")?.value;

    // If not in cookie, try to get from body (but don't fail if body is empty)
    if (!refreshToken) {
      try {
        const body = await request.json();
        refreshToken = body.refreshToken;
      } catch {
        // No body or invalid JSON, that's okay
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { success: false, error: "Refresh token is required" },
        { status: 401 }
      );
    }

    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);

    if (!payload) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired refresh token" },
        { status: 401 }
      );
    }

    const db = await dbManager.getDatabase();

    // CRITICAL FIX: Find the session using userId AND refresh token
    // This is more efficient and prevents token reuse across users
    // Also check both old and potentially new refresh tokens to handle race conditions
    // IMPORTANT: userId is stored as STRING in database, not ObjectId!
    let session = await db.collection("sessions").findOne({
      userId: payload.userId, // Use string, not ObjectId
      refreshToken,
      isActive: true,
    });

    // CRITICAL FIX: If session not found with current refresh token,
    // it might be a race condition where the token was already refreshed
    // In this case, find by userId and check if session was refreshed recently (within 5 minutes)
    if (!session) {
      // Look for active session for this user that was updated in the last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      session = await db.collection("sessions").findOne({
        userId: payload.userId, // Use string, not ObjectId
        isActive: true,
        lastActivityAt: { $gte: fiveMinutesAgo },
        expiresAt: { $gt: new Date() }, // Not expired
      });

      if (session) {
        // Use the existing session's refresh token going forward
        refreshToken = session.refreshToken;
      } else {
        // FALLBACK: Check for ANY active, non-expired session
        // This handles cases where user returns after hours of inactivity
        session = await db.collection("sessions").findOne({
          userId: payload.userId, // Use string, not ObjectId
          isActive: true,
          expiresAt: { $gt: new Date() }, // Not expired
        });

        if (session) {
          // Use this session and reactivate it
          refreshToken = session.refreshToken;
        }
      }

      if (!session) {
        return NextResponse.json(
          { success: false, error: "Session not found or expired" },
          { status: 401 }
        );
      }
    }

    // Check if session has expired
    // IMPORTANT: Only mark as inactive if session is truly expired (not just about to expire)
    const now = new Date();
    const sessionExpiry = new Date(session.expiresAt);

    if (now > sessionExpiry) {
      await db
        .collection("sessions")
        .updateOne({ _id: session._id }, { $set: { isActive: false } });

      return NextResponse.json(
        { success: false, error: "Session has expired. Please login again." },
        { status: 401 }
      );
    }

    // Get user
    // Note: users collection uses ObjectId for _id
    const user = await db.collection("users").findOne({
      _id: new ObjectId(payload.userId),
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );
    }

    // Check if account is locked
    if (user.accountLocked) {
      return NextResponse.json(
        { success: false, error: "Account is locked" },
        { status: 403 }
      );
    }

    // Preserve the rememberMe flag from the original login session
    // Default to false for backward compatibility with old sessions
    const rememberMe = session.rememberMe || false;

    // Generate new token pair with same rememberMe setting as original login
    const newTokenPair = generateTokenPair(
      {
        userId: payload.userId,
        email: user.email,
        role: user.role,
        rememberMe, // Preserve rememberMe in JWT payload
      },
      rememberMe
    );

    // OPTION B: FIXED SESSION DURATION
    // Session expires at the ORIGINAL login time + duration
    // Refreshing tokens does NOT extend the session expiry
    // This ensures sessions expire exactly 1 day (or 7 days) after login

    // Use the original expiry time if it exists (for fixed session)
    // For backward compatibility, if originalExpiresAt doesn't exist, calculate it
    const originalExpiresAt = session.originalExpiresAt
      ? new Date(session.originalExpiresAt)
      : new Date(
          session.createdAt.getTime() +
            (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000
        );

    // CRITICAL CHECK: Verify session hasn't exceeded original expiry
    // Reuse the 'now' variable from above
    if (now > originalExpiresAt) {
      // Session has exceeded its original lifetime - reject refresh
      await db
        .collection("sessions")
        .updateOne({ _id: session._id }, { $set: { isActive: false } });

      return NextResponse.json(
        {
          success: false,
          error: "Session has expired. Please login again.",
          reason: "session_expired",
        },
        { status: 401 }
      );
    }

    // Update the existing session (don't delete and recreate)
    // IMPORTANT: Keep the ORIGINAL expiresAt - do NOT extend it
    const updateResult = await db.collection("sessions").updateOne(
      { _id: session._id },
      {
        $set: {
          accessToken: newTokenPair.accessToken,
          refreshToken: newTokenPair.refreshToken,
          // expiresAt stays the SAME (original expiry time) - not extended!
          lastActivityAt: new Date(), // Update last activity timestamp
          // Preserve rememberMe flag (already exists, but explicitly set for clarity)
          rememberMe: rememberMe,
        },
        $setOnInsert: {
          // For backward compatibility - initialize these if they don't exist
          createdAt: session.createdAt || new Date(),
          originalExpiresAt: originalExpiresAt, // Store original expiry
        },
      }
    );

    // Verify the update succeeded
    if (updateResult.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Session not found" },
        { status: 401 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Tokens refreshed successfully",
        data: {
          accessToken: newTokenPair.accessToken,
          expiresAt: newTokenPair.accessTokenExpiresAt,
        },
      },
      { status: 200 }
    );

    // CRITICAL FIX: Set cookie maxAge to match refresh token expiry (same as login)
    // This ensures cookies persist as long as the refresh token is valid
    // With Remember Me: 7 days (long-lived session)
    // Without Remember Me: 1 day (shorter session but still persists across browser restarts)
    const cookieMaxAge = rememberMe
      ? 7 * 24 * 60 * 60 // 7 days in seconds
      : 1 * 24 * 60 * 60; // 1 day in seconds

    response.cookies.set("accessToken", newTokenPair.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    response.cookies.set("refreshToken", newTokenPair.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: cookieMaxAge,
      path: "/",
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "An error occurred while refreshing token" },
      { status: 500 }
    );
  }
}
