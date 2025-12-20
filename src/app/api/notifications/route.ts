import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

// GET - Get user notifications
export async function GET(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // Get current session ID from refresh token
    const token = request.cookies.get("refreshToken")?.value;
    let sessionId: string | undefined;

    if (token) {
      try {
        const client = await clientPromise;
        const db = client.db("spend-tracker");
        const session = await db.collection("sessions").findOne({
          userId: user.userId,
          token,
          isActive: true,
        });
        if (session) {
          sessionId = session._id.toString();
        }
      } catch {
        // Ignore session lookup errors - will show all notifications
      }
    }

    // Get notifications (excluding those meant for current session)
    const result = await notificationService.getUserNotifications(
      user.userId,
      page,
      limit,
      sessionId
    );

    const response = NextResponse.json({
      success: true,
      data: result,
    });

    // Prevent any caching for notifications
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to get notifications" },
      { status: 500 }
    );
  }
}

// PATCH - Mark notification as read and set TTL
export async function PATCH(request: NextRequest) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { notificationId, markAsRead, markAllAsRead, setTTL } = body;

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    if (markAllAsRead) {
      // Mark all unread notifications as read and optionally set TTL
      const updateData: any = { read: true };
      if (setTTL) {
        // Set expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        updateData.expiresAt = expiresAt;
      }

      const result = await db.collection("notifications").updateMany(
        {
          userId: user.userId,
          read: false,
        },
        {
          $set: updateData,
        }
      );

      return NextResponse.json({
        success: true,
        message: `Marked ${result.modifiedCount} notifications as read`,
        modifiedCount: result.modifiedCount,
      });
    } else if (notificationId && markAsRead) {
      // Mark specific notification as read and optionally set TTL
      const updateData: any = { read: true };
      if (setTTL) {
        // Set expiry to 24 hours from now
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24);
        updateData.expiresAt = expiresAt;
      }

      const result = await db.collection("notifications").updateOne(
        {
          _id: new ObjectId(notificationId),
          userId: user.userId,
        },
        {
          $set: updateData,
        }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json(
          {
            success: false,
            error: "Notification not found",
          },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        message: "Notification marked as read",
        modifiedCount: result.modifiedCount,
      });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid request parameters",
        },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to update notifications" },
      { status: 500 }
    );
  }
}
