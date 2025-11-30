import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { getUserFromRequest } from "@/lib/auth";

export async function GET(request: NextRequest) {
  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "month";

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    let groupBy: Record<string, unknown> = {};
    const matchFilter: Record<string, unknown> = {};

    // Set date range based on period
    const now = new Date();
    if (period === "month") {
      // Last 12 months
      const startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
      matchFilter.date = { $gte: startDate };
      groupBy = {
        year: { $year: "$date" },
        month: { $month: "$date" },
      };
    } else if (period === "quarter") {
      // Last 4 quarters
      const startDate = new Date(now.getFullYear() - 1, now.getMonth(), 1);
      matchFilter.date = { $gte: startDate };
      groupBy = {
        year: { $year: "$date" },
        quarter: {
          $ceil: { $divide: [{ $month: "$date" }, 3] },
        },
      };
    } else if (period === "year") {
      // Last 5 years
      const startDate = new Date(now.getFullYear() - 4, 0, 1);
      matchFilter.date = { $gte: startDate };
      groupBy = {
        year: { $year: "$date" },
      };
    }

    // Aggregate trends data
    const trends = await db
      .collection("expenses")
      .aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: groupBy,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            personalExpenses: {
              $sum: {
                $cond: [{ $eq: ["$isSplit", false] }, "$amount", 0],
              },
            },
            splitExpenses: {
              $sum: {
                $cond: [{ $eq: ["$isSplit", true] }, "$amount", 0],
              },
            },
            saketExpenses: {
              $sum: {
                $cond: [{ $eq: ["$paidBy", "saket"] }, "$amount", 0],
              },
            },
            ayushExpenses: {
              $sum: {
                $cond: [{ $eq: ["$paidBy", "ayush"] }, "$amount", 0],
              },
            },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.quarter": 1 } },
      ])
      .toArray();

    // Format the data for charts
    const formattedTrends = trends.map((item) => {
      let label = "";
      if (period === "month") {
        const monthNames = [
          "Jan",
          "Feb",
          "Mar",
          "Apr",
          "May",
          "Jun",
          "Jul",
          "Aug",
          "Sep",
          "Oct",
          "Nov",
          "Dec",
        ];
        label = `${monthNames[item._id.month - 1]} ${item._id.year}`;
      } else if (period === "quarter") {
        label = `Q${item._id.quarter} ${item._id.year}`;
      } else {
        label = item._id.year.toString();
      }

      return {
        ...item,
        label,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        trends: formattedTrends,
        period,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch trends analytics" },
      { status: 500 }
    );
  }
}
