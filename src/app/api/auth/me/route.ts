/**
 * GET /api/auth/me
 *
 * Validates existing session and returns user data for frontend state restoration.
 *
 * SECURITY: Does NOT extend session expiry - sessions have fixed expiration from login time.
 * This route is called on page reload/app initialization to restore authentication state,
 * but maintains the FIXED session expiry set during original login.
 *
 * Behavior:
 * - Validates JWT token signature
 * - Checks session still exists and is active in database
 * - Verifies session hasn't reached fixed expiry time
 * - Updates lastActivityAt for tracking only (NOT expiry)
 * - Returns user data if session valid
 * - Returns 401 if session expired or invalid
 *
 * Rate limit: 30 requests per minute per IP (prevents refresh abuse)
 *
 * @returns { user } with user data if session valid
 * @returns { error } with 401 if session expired or invalid
 * @returns { error } with 429 if rate limit exceeded
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { RateLimiter } from "@/lib/utils/security";
import { getIpAddress } from "@/lib/device-info";
import logger from "@/lib/logger";

// Rate limiter: 30 requests per minute per IP
// More lenient than auth endpoints since this is called frequently by frontend
const meRateLimiter = new RateLimiter(30, 60 * 1000);

export async function GET(request: NextRequest) {
  try {
    // Extract client IP for rate limiting
    const clientIp = getIpAddress(request.headers);

    // Rate limiting: Prevent excessive refresh attempts
    if (!meRateLimiter.isAllowed(clientIp)) {
      return NextResponse.json(
        {
          success: false,
          error: "Too many requests. Please slow down.",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" }, // 1 minute
        }
      );
    }

    // Verify JWT token and check active session in database
    // This also validates session.expiresAt hasn't been reached
    const tokenUser = await getUserFromRequest(request);
    if (!tokenUser) {
      // Token invalid or session expired/revoked
      // Clear the cookie to prevent redirect loop
      const response = NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );

      // Clear the refresh token cookie
      response.cookies.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0, // Expire immediately
        path: "/",
      });

      return response;
    }

    // Fetch current user data from database (in case profile updated)
    const user = await dbManager.getUserById(tokenUser.userId);

    if (!user) {
      // User deleted from database - clear cookie
      const response = NextResponse.json(
        { success: false, error: "User not found" },
        { status: 404 }
      );

      // Clear the refresh token cookie
      response.cookies.set("refreshToken", "", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 0,
        path: "/",
      });

      return response;
    }

    // Return user data without sensitive fields
    // SECURITY: Never send passwordHash or verification tokens to client
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...userResponse } = user;

    return NextResponse.json({
      success: true,
      data: { user: userResponse },
    });
  } catch (error) {
    // Log error server-side only (don't expose internals to client)
    if (process.env.NODE_ENV !== "production") {
      logger.error("Get user info error", error, { context: "/api/auth/me" });
    }

    // Generic error response
    return NextResponse.json(
      { success: false, error: "Failed to get user information" },
      { status: 500 }
    );
  }
}
