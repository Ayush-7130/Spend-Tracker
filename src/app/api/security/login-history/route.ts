/**
 * Login History API Route
 * Get user's login history for security audit
 */

import { NextRequest, NextResponse } from "next/server";
import { createApiRoute } from "@/lib/api-middleware";
import { dbManager } from "@/lib/database";

// GET: Get user's login history
const handleGetLoginHistory = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const { searchParams } = new URL(request.url);

      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "20");
      const filter = searchParams.get("filter") || "all"; // all, success, failed

      const db = await dbManager.getDatabase();

      // Build query
      const query: any = { userId: user.id };

      if (filter === "success") {
        query.success = true;
      } else if (filter === "failed") {
        query.success = false;
      }

      // Get total count
      const total = await db.collection("loginHistory").countDocuments(query);

      // Get paginated history
      const skip = (page - 1) * limit;
      const history = await db
        .collection("loginHistory")
        .find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .toArray();

      // Format response
      const formattedHistory = history.map((entry) => ({
        id: entry._id.toString(),
        email: entry.email,
        success: entry.success,
        ipAddress: entry.ipAddress,
        device: entry.deviceInfo?.browser
          ? `${entry.deviceInfo.browser} on ${entry.deviceInfo.os || "Unknown OS"}`
          : "Unknown Device",
        deviceType: entry.deviceInfo?.device,
        location: entry.location
          ? `${entry.location.city || "Unknown"}, ${entry.location.country || "Unknown"}`
          : undefined,
        failureReason: entry.failureReason,
        timestamp: entry.timestamp,
      }));

      return NextResponse.json({
        success: true,
        data: {
          history: formattedHistory,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
          stats: {
            totalAttempts: total,
            successfulLogins: await db
              .collection("loginHistory")
              .countDocuments({
                userId: user.id,
                success: true,
              }),
            failedAttempts: await db.collection("loginHistory").countDocuments({
              userId: user.id,
              success: false,
            }),
          },
        },
      });
    } catch (error) {      return NextResponse.json(
        { success: false, error: "Failed to retrieve login history" },
        { status: 500 }
      );
    }
  },
});

export async function GET(request: NextRequest) {
  return handleGetLoginHistory(request);
}
