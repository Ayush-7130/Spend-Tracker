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
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Get current date info
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month expenses
    const currentMonthExpenses = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: currentMonthStart,
              $lte: currentMonthEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get last month expenses
    const lastMonthExpenses = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: lastMonthStart,
              $lte: lastMonthEnd,
            },
          },
        },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const currentMonthTotal = currentMonthExpenses[0]?.totalAmount || 0;
    const currentMonthCount = currentMonthExpenses[0]?.count || 0;
    const lastMonthTotal = lastMonthExpenses[0]?.totalAmount || 0;
    const lastMonthCount = lastMonthExpenses[0]?.count || 0;

    // Calculate percentage change
    const percentageChange =
      lastMonthTotal > 0
        ? ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100
        : 0;

    // Get top categories for current month
    const topCategories = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: currentMonthStart,
              $lte: currentMonthEnd,
            },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $group: {
            _id: "$category",
            amount: { $sum: "$amount" },
            categoryName: {
              $first: { $arrayElemAt: ["$categoryDetails.name", 0] },
            },
          },
        },
        {
          $sort: { amount: -1 },
        },
        {
          $limit: 5,
        },
        {
          $project: {
            name: { $ifNull: ["$categoryName", "Uncategorized"] },
            amount: 1,
            percentage: {
              $multiply: [
                {
                  $divide: [
                    "$amount",
                    currentMonthTotal > 0 ? currentMonthTotal : 1,
                  ],
                },
                100,
              ],
            },
          },
        },
      ])
      .toArray();

    // Calculate daily average
    const daysElapsed = now.getDate();
    const dailyAverage = daysElapsed > 0 ? currentMonthTotal / daysElapsed : 0;

    // Get highest expense day
    const highestExpenseDay = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: currentMonthStart,
              $lte: currentMonthEnd,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            totalAmount: { $sum: "$amount" },
            expenses: {
              $push: {
                amount: "$amount",
                description: "$description",
              },
            },
          },
        },
        {
          $sort: { totalAmount: -1 },
        },
        {
          $limit: 1,
        },
        {
          $project: {
            date: "$_id",
            amount: "$totalAmount",
            description: {
              $let: {
                vars: {
                  maxExpense: {
                    $arrayElemAt: [
                      {
                        $filter: {
                          input: "$expenses",
                          cond: {
                            $eq: [
                              "$$this.amount",
                              { $max: "$expenses.amount" },
                            ],
                          },
                        },
                      },
                      0,
                    ],
                  },
                },
                in: "$$maxExpense.description",
              },
            },
          },
        },
      ])
      .toArray();

    // Get category distribution for pie chart
    const categoryDistribution = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: currentMonthStart,
              $lte: currentMonthEnd,
            },
          },
        },
        {
          $lookup: {
            from: "categories",
            localField: "category",
            foreignField: "_id",
            as: "categoryDetails",
          },
        },
        {
          $group: {
            _id: "$category",
            amount: { $sum: "$amount" },
            categoryName: {
              $first: { $arrayElemAt: ["$categoryDetails.name", 0] },
            },
          },
        },
        {
          $sort: { amount: -1 },
        },
        {
          $project: {
            name: { $ifNull: ["$categoryName", "Uncategorized"] },
            amount: 1,
          },
        },
      ])
      .toArray();

    const overviewData = {
      currentMonthTotal: Math.round(currentMonthTotal * 100) / 100,
      currentMonthCount,
      lastMonthTotal: Math.round(lastMonthTotal * 100) / 100,
      lastMonthCount,
      percentageChange: Math.round(percentageChange * 100) / 100,
      topCategories: topCategories.map((cat) => ({
        name: cat.name,
        amount: Math.round(cat.amount * 100) / 100,
        percentage: Math.round(cat.percentage * 100) / 100,
      })),
      dailyAverage: Math.round(dailyAverage * 100) / 100,
      highestExpenseDay: highestExpenseDay[0]
        ? {
            date: highestExpenseDay[0].date,
            amount: Math.round(highestExpenseDay[0].amount * 100) / 100,
            description:
              highestExpenseDay[0].description || "Multiple expenses",
          }
        : {
            date: new Date().toISOString().split("T")[0],
            amount: 0,
            description: "No expenses",
          },
      categoryDistribution: {
        labels: categoryDistribution.map((cat) => cat.name),
        amounts: categoryDistribution.map(
          (cat) => Math.round(cat.amount * 100) / 100
        ),
      },
    };

    return NextResponse.json({
      success: true,
      data: overviewData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch overview data" },
      { status: 500 }
    );
  }
}
