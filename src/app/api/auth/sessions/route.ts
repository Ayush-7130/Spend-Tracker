/**
 * Sessions Management API Route
 * Get and manage user sessions
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";
import { ObjectId } from "mongodb";
import { notificationService } from "@/lib/notifications";
import { getDeviceDescription } from "@/lib/device-info";

// GET: Get all active sessions for the current user
const handleGetSessions = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const db = await dbManager.getDatabase();

      // Get all active sessions
      const sessions = await db
        .collection("sessions")
        .find({
          userId: user.id,
          isActive: true,
          expiresAt: { $gt: new Date() },
        })
        .sort({ lastActivityAt: -1 })
        .toArray();

      // Get current session token
      const currentAccessToken = request.cookies.get("accessToken")?.value;

      const formattedSessions = sessions.map((session) => ({
        id: session._id.toString(),
        device: getDeviceDescription(session.deviceInfo),
        browser: session.deviceInfo.browser,
        os: session.deviceInfo.os,
        deviceType: session.deviceInfo.device,
        location: session.location
          ? `${session.location.city || "Unknown"}, ${session.location.country || "Unknown"}`
          : undefined,
        createdAt: session.createdAt,
        lastActivityAt: session.lastActivityAt,
        expiresAt: session.expiresAt,
        isCurrent: session.accessToken === currentAccessToken,
      }));

      return NextResponse.json({
        success: true,
        data: {
          sessions: formattedSessions,
          total: formattedSessions.length,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve sessions" },
        { status: 500 }
      );
    }
  },
});

// DELETE: Revoke specific session or all sessions
const handleRevokeSession = createApiRoute({
  methods: ["DELETE"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const { searchParams } = new URL(request.url);
      const sessionId = searchParams.get("sessionId");
      const revokeAll = searchParams.get("revokeAll") === "true";

      const db = await dbManager.getDatabase();
      const currentAccessToken = request.cookies.get("accessToken")?.value;

      // Security: Apply 24-hour restriction when revoking sessions
      // This prevents a newly compromised session from immediately revoking all legitimate sessions
      if (revokeAll) {
        // Get current session to check its age
        const currentSession = await db.collection("sessions").findOne({
          userId: user.id,
          accessToken: currentAccessToken,
          isActive: true,
        });

        if (currentSession) {
          const sessionAge =
            Date.now() - new Date(currentSession.createdAt).getTime();
          const oneDayInMs = 24 * 60 * 60 * 1000;

          // Session must be at least 1 day old to revoke all other sessions
          if (sessionAge < oneDayInMs) {
            const hoursLeft = Math.ceil(
              (oneDayInMs - sessionAge) / (60 * 60 * 1000)
            );
            return NextResponse.json(
              {
                success: false,
                error: `You must wait ${hoursLeft} more hour(s) before you can revoke other sessions. New sessions must be active for at least 24 hours.`,
              },
              { status: 403 }
            );
          }
        }

        // Revoke all sessions except the current one
        const result = await db.collection("sessions").updateMany(
          {
            userId: user.id,
            isActive: true,
            accessToken: { $ne: currentAccessToken },
          },
          { $set: { isActive: false } }
        );

        // Clear all session cache since we revoked multiple sessions
        const { clearSessionCache } = await import("@/lib/auth");
        clearSessionCache(); // Clear entire cache

        // Log security event (no IP address)
        await db.collection("securityLogs").insertOne({
          userId: user.id,
          eventType: "session_revoked",
          description: `User revoked all other sessions`,
          timestamp: new Date(),
        });

        return NextResponse.json({
          success: true,
          message: `${result.modifiedCount} session(s) revoked successfully`,
        });
      }

      if (!sessionId) {
        return NextResponse.json(
          { success: false, error: "Session ID is required" },
          { status: 400 }
        );
      }

      // Get current session to check its age
      const currentSession = await db.collection("sessions").findOne({
        userId: user.id,
        accessToken: currentAccessToken,
        isActive: true,
      });

      if (currentSession) {
        const sessionAge =
          Date.now() - new Date(currentSession.createdAt).getTime();
        const oneDayInMs = 24 * 60 * 60 * 1000;

        // Current session must be at least 1 day old to revoke other sessions
        if (sessionAge < oneDayInMs) {
          const hoursLeft = Math.ceil(
            (oneDayInMs - sessionAge) / (60 * 60 * 1000)
          );
          return NextResponse.json(
            {
              success: false,
              error: `You must wait ${hoursLeft} more hour(s) before you can revoke other sessions. New sessions must be active for at least 24 hours before managing other sessions.`,
            },
            { status: 403 }
          );
        }
      }

      // Get session details before revoking
      const session = await db.collection("sessions").findOne({
        _id: new ObjectId(sessionId),
        userId: user.id,
        isActive: true,
      });

      if (!session) {
        return NextResponse.json(
          { success: false, error: "Session not found or already revoked" },
          { status: 404 }
        );
      }

      // Prevent revoking the current session
      if (session.accessToken === currentAccessToken) {
        return NextResponse.json(
          {
            success: false,
            error: "Cannot revoke your current session. Please logout instead.",
          },
          { status: 400 }
        );
      }

      // Revoke specific session
      await db
        .collection("sessions")
        .updateOne(
          { _id: new ObjectId(sessionId) },
          { $set: { isActive: false } }
        );

      // Clear session from validation cache
      const { clearSessionCache } = await import("@/lib/auth");
      clearSessionCache(session.accessToken);

      // Send notification - DISABLED per user request
      const deviceDescription = getDeviceDescription(session.deviceInfo);
      await notificationService.notifySessionRevoked(
        user.id,
        deviceDescription
      );

      // Log security event (no IP address)
      await db.collection("securityLogs").insertOne({
        userId: user.id,
        eventType: "session_revoked",
        description: `Session revoked: ${deviceDescription}`,
        metadata: { sessionId, deviceInfo: session.deviceInfo },
        timestamp: new Date(),
      });

      return NextResponse.json({
        success: true,
        message: "Session revoked successfully",
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to revoke session" },
        { status: 500 }
      );
    }
  },
});

export async function GET(request: NextRequest) {
  return handleGetSessions(request);
}

export async function DELETE(request: NextRequest) {
  return handleRevokeSession(request);
}
