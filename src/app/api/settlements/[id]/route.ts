import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { NotificationService } from "@/lib/notifications";
import { invalidateCache } from "@/lib/cache";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Validate that id is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid settlement ID" },
        { status: 400 }
      );
    }

    // Get the settlement before deleting to send notification
    const settlement = await db
      .collection("settlements")
      .findOne({ _id: new ObjectId(id) });

    if (!settlement) {
      return NextResponse.json(
        { success: false, error: "Settlement not found" },
        { status: 404 }
      );
    }

    const result = await db
      .collection("settlements")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Settlement not found" },
        { status: 404 }
      );
    }

    // Send notification about settlement deletion
    try {
      const notificationService = NotificationService.getInstance();
      const currentUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(user.userId) });

      if (currentUser) {
        const otherUserName =
          settlement.fromUser === currentUser.name
            ? settlement.toUser
            : settlement.fromUser;
        const otherUser = await db
          .collection("users")
          .findOne({ name: otherUserName });

        if (otherUser && otherUser._id.toString() !== user.userId) {
          await notificationService.sendNotification(otherUser._id.toString(), {
            type: "settlement_deleted",
            actorName: currentUser.name,
            entityName:
              settlement.description ||
              `Settlement from ${settlement.fromUser} to ${settlement.toUser}`,
            amount: settlement.amount,
          });
        }
      }
    } catch {
      // Continue without failing the deletion
    }

    // Invalidate settlement cache
    invalidateCache.settlement();

    return NextResponse.json({
      success: true,
      message: "Settlement deleted successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Get authenticated user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Validate that id is a valid ObjectId
    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid settlement ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { fromUser, toUser, amount, description, date, status } = body;

    // Validate required fields
    if (!fromUser || !toUser || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields: fromUser, toUser, amount",
        },
        { status: 400 }
      );
    }

    // Build update object
    const updateData: any = {
      fromUser,
      toUser,
      amount: parseFloat(amount),
      description: description || "",
      date: date ? new Date(date) : new Date(),
      status: status || "settled",
      updatedBy: user.userId,
      updatedAt: new Date(),
    };

    const result = await db
      .collection("settlements")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: "Settlement not found" },
        { status: 404 }
      );
    }

    // Send notification about settlement update
    try {
      const notificationService = NotificationService.getInstance();
      const currentUser = await db
        .collection("users")
        .findOne({ _id: new ObjectId(user.userId) });

      if (currentUser) {
        const otherUserName = fromUser === currentUser.name ? toUser : fromUser;
        const otherUser = await db
          .collection("users")
          .findOne({ name: otherUserName });

        if (otherUser && otherUser._id.toString() !== user.userId) {
          await notificationService.sendNotification(otherUser._id.toString(), {
            type: "settlement_updated",
            actorName: currentUser.name,
            entityName:
              description || `Settlement from ${fromUser} to ${toUser}`,
            amount: parseFloat(amount),
          });
        }
      }
    } catch {
      // Continue without failing the update
    }

    // Invalidate settlement cache
    invalidateCache.settlement();

    return NextResponse.json({
      success: true,
      message: "Settlement updated successfully",
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
