import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Get current user and session info
    const user = await getUserFromRequest(request);
    const accessToken = request.cookies.get("accessToken")?.value;
    const refreshToken = request.cookies.get("refreshToken")?.value;

    // Mark session as inactive in database
    if (user && (accessToken || refreshToken)) {
      try {
        const db = await dbManager.getDatabase();

        // Find and deactivate the current session
        const filter: any = {
          userId: user.userId,
          isActive: true,
        };

        // Match by either access or refresh token
        if (accessToken && refreshToken) {
          filter.$or = [{ accessToken }, { refreshToken }];
        } else if (accessToken) {
          filter.accessToken = accessToken;
        } else if (refreshToken) {
          filter.refreshToken = refreshToken;
        }

        const result = await db.collection("sessions").updateOne(filter, {
          $set: {
            isActive: false,
            loggedOutAt: new Date(),
          },
        });

        // Log security event
        if (result.modifiedCount > 0) {
          await db.collection("securityLogs").insertOne({
            userId: user.userId,
            eventType: "logout",
            description: "User logged out",
            timestamp: new Date(),
          });
        }
      } catch (dbError) {
        // Continue with cookie clearing even if DB cleanup fails
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear both accessToken and refreshToken cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/",
    };

    response.cookies.set("accessToken", "", cookieOptions);
    response.cookies.set("refreshToken", "", cookieOptions);

    // Also clear legacy auth-token if it exists
    response.cookies.set("auth-token", "", cookieOptions);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
