/**
 * Logout API Route
 *
 * Terminates the current user session by:
 * 1. Marking the session inactive in the database (prevents reuse of stolen tokens)
 * 2. Clearing authentication cookies from the browser
 * 3. Logging security event for audit trail
 *
 * Security: Even if database update fails, cookies are cleared to prevent client-side reuse
 */

import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { getUserFromRequest } from "@/lib/auth";
import logger from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    // Extract user identity and session token from request
    // getUserFromRequest validates token signature and session expiry
    const user = await getUserFromRequest(request);
    const token = request.cookies.get("refreshToken")?.value;

    // Revoke session in database to prevent token reuse
    // Critical for security: stolen tokens become useless after logout
    if (user && token) {
      try {
        const db = await dbManager.getDatabase();

        // Atomically deactivate the session in database
        // isActive flag prevents token reuse even if token hasn't expired yet
        const result = await db.collection("sessions").updateOne(
          {
            userId: user.userId,
            token: token,
            isActive: true,
          },
          {
            $set: {
              isActive: false,
              loggedOutAt: new Date(),
            },
          }
        );

        // Create audit trail for compliance and security monitoring
        // Tracks voluntary logouts vs automatic session expiry
        if (result.modifiedCount > 0) {
          await db.collection("securityLogs").insertOne({
            userId: user.userId,
            eventType: "logout",
            description: "User logged out",
            timestamp: new Date(),
          });
        }
      } catch {
        // Fail gracefully: Cookie clearing is more important than DB update
        // User is still logged out from client perspective
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Remove authentication cookies from browser
    // httpOnly prevents JavaScript access, secure ensures HTTPS-only in production
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 0, // Immediate expiration
      path: "/",
    };

    // Clear current session token
    response.cookies.set("refreshToken", "", cookieOptions);

    // Clear legacy cookies from old authentication system (migration safety)
    response.cookies.set("accessToken", "", cookieOptions);

    return response;
  } catch (error) {
    logger.error("Logout error", error, { context: "/api/auth/logout" });
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
