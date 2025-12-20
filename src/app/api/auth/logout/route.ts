import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { getUserFromRequest } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    // Get current user and session info
    const user = await getUserFromRequest(request);
    const token = request.cookies.get("refreshToken")?.value;

    // Mark session as inactive in database
    if (user && token) {
      try {
        const db = await dbManager.getDatabase();

        // Find and deactivate the current session
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

        // Log security event
        if (result.modifiedCount > 0) {
          await db.collection("securityLogs").insertOne({
            userId: user.userId,
            eventType: "logout",
            description: "User logged out",
            timestamp: new Date(),
          });
        }
      } catch {
        // Continue with cookie clearing even if DB cleanup fails
      }
    }

    const response = NextResponse.json({
      success: true,
      message: "Logged out successfully",
    });

    // Clear all authentication cookies
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      maxAge: 0,
      path: "/",
    };

    // Clear current refreshToken cookie
    response.cookies.set("refreshToken", "", cookieOptions);

    // Clear legacy cookies (in case they still exist from old sessions)
    response.cookies.set("accessToken", "", cookieOptions);

    return response;
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json(
      { success: false, error: "Logout failed" },
      { status: 500 }
    );
  }
}
