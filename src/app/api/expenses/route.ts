import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";
import { notificationService } from "@/lib/notifications";
import { dbManager } from "@/lib/database";
import { withCache, cacheKeys, invalidateCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const category = searchParams.get("category");
    const paidBy = searchParams.get("paidBy");
    const search = searchParams.get("search");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const sortBy = searchParams.get("sortBy") || "date";
    const sortOrder = searchParams.get("sortOrder") || "desc";

    // Create cache key from query parameters
    const filterStr = JSON.stringify({
      category,
      paidBy,
      search,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    });
    const cacheKey = cacheKeys.expenses(page, limit, filterStr);

    // Try to get from cache (TTL: 2 minutes for list data)
    const cachedData = await withCache(
      cacheKey,
      async () => {
        const client = await clientPromise;
        const db = client.db("spend-tracker");

        // Build filter object
        interface FilterType {
          category?: string;
          paidBy?: string;
          description?: { $regex: string; $options: string };
          date?: { $gte?: Date; $lte?: Date };
        }
        const filter: FilterType = {};

        if (category) filter.category = category;
        if (paidBy) filter.paidBy = paidBy;
        if (search) {
          filter.description = { $regex: search, $options: "i" };
        }
        if (startDate || endDate) {
          filter.date = {};
          if (startDate) filter.date.$gte = new Date(startDate);
          if (endDate) filter.date.$lte = new Date(endDate);
        }

        // Build sort object
        const sort: Record<string, 1 | -1> = {};
        sort[sortBy] = sortOrder === "asc" ? 1 : -1;

        const skip = (page - 1) * limit;

        // Optimized aggregation pipeline with projection
        const [expenses, total] = await Promise.all([
          db
            .collection("expenses")
            .aggregate([
              { $match: filter },
              // Project only necessary fields to reduce memory usage
              {
                $project: {
                  _id: 1,
                  amount: 1,
                  description: 1,
                  date: 1,
                  category: 1,
                  subcategory: 1,
                  paidBy: 1,
                  isSplit: 1,
                  splitDetails: 1,
                  createdAt: 1,
                },
              },
              {
                $lookup: {
                  from: "categories",
                  localField: "category",
                  foreignField: "_id",
                  as: "categoryDetails",
                  // Only fetch category name, not the entire document
                  pipeline: [{ $project: { name: 1, _id: 1 } }],
                },
              },
              { $sort: sort },
              { $skip: skip },
              { $limit: limit },
            ])
            .toArray(),
          db.collection("expenses").countDocuments(filter),
        ]);

        // Ensure _id is converted to string
        const serializedExpenses = expenses.map((exp) => ({
          ...exp,
          _id: exp._id.toString(),
        }));

        return {
          expenses: serializedExpenses,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
          },
        };
      },
      2 * 60 * 1000 // 2 minutes cache
    );

    // Add cache headers for client-side caching
    const response = NextResponse.json({
      success: true,
      data: cachedData,
    });

    // Set cache control headers
    response.headers.set(
      "Cache-Control",
      "public, s-maxage=120, stale-while-revalidate=60"
    );
    response.headers.set("CDN-Cache-Control", "public, s-maxage=120");

    return response;
  } catch (error: unknown) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch expenses" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
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
    const {
      amount,
      description,
      date,
      category,
      subcategory,
      paidBy,
      isSplit = false,
      splitDetails = null,
    } = body;

    // Validation
    if (!amount || !description || !date || !category || !paidBy) {
      return NextResponse.json(
        { success: false, error: "Required fields missing" },
        { status: 400 }
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    // Validate split logic
    if (isSplit && splitDetails) {
      const { saketAmount = 0, ayushAmount = 0 } = splitDetails;
      if (Math.abs(saketAmount + ayushAmount - amount) > 0.01) {
        return NextResponse.json(
          { success: false, error: "Split amounts must equal total amount" },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    const expense = {
      amount: parseFloat(amount),
      description,
      date: new Date(date),
      category,
      subcategory: subcategory || "",
      paidBy,
      isSplit,
      splitDetails: isSplit ? splitDetails : null,
      createdBy: user.userId, // Add ownership
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("expenses").insertOne(expense);
    const createdExpense = { ...expense, _id: result.insertedId.toString() };

    // Invalidate related caches
    invalidateCache.expense();

    // Log activity

    // Send notification to other users
    const currentUser = await dbManager.getUserById(user.userId);
    if (currentUser) {
      await notificationService.broadcastNotification(user.userId, {
        type: "expense_added",
        actorName: currentUser.name,
        entityName: description,
        entityId: result.insertedId.toString(),
        amount: parseFloat(amount),
        isSplit: isSplit,
      });
    }

    return NextResponse.json({
      success: true,
      data: createdExpense,
    });
  } catch (error: unknown) {
    console.error("Create expense error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create expense" },
      { status: 500 }
    );
  }
}
