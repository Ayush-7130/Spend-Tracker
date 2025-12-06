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
    const customStart = searchParams.get("startDate");
    const customEnd = searchParams.get("endDate");

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Generate complete date range helper function
    const generateDateRange = (start: Date, end: Date) => {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    // Calculate date range based on period
    let startDate: Date, endDate: Date;
    const now = new Date();

    switch (period) {
      case "week":
        // Start 6 days ago, end today (inclusive of current date)
        startDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - 6
        );
        endDate = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case "quarter":
        const quarterStart = Math.floor(now.getMonth() / 3) * 3;
        startDate = new Date(now.getFullYear(), quarterStart, 1);
        endDate = new Date(now.getFullYear(), quarterStart + 3, 0);
        break;
      case "year":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      case "custom":
        if (customStart && customEnd) {
          startDate = new Date(customStart);
          endDate = new Date(customEnd);
          // Set end date to end of day
          endDate.setHours(23, 59, 59);
        } else {
          // Default to current month if custom dates not provided
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
    }

    // Get daily spending trends
    const dailyTrends = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: startDate,
              $lte: endDate,
            },
          },
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" },
            },
            totalAmount: { $sum: "$amount" },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ])
      .toArray();

    // Get category-wise data based on selected period for stacked chart
    const categoryData = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: startDate,
              $lte: endDate,
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
            _id: {
              period: {
                $switch: {
                  branches: [
                    {
                      case: { $eq: [period, "week"] },
                      then: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" },
                      },
                    },
                    {
                      case: { $eq: [period, "month"] },
                      then: {
                        $dateToString: { format: "%Y-%m-%d", date: "$date" },
                      },
                    },
                    {
                      case: { $eq: [period, "quarter"] },
                      then: {
                        $dateToString: { format: "%Y-%m", date: "$date" },
                      },
                    },
                    {
                      case: { $eq: [period, "year"] },
                      then: {
                        $dateToString: { format: "%Y-%m", date: "$date" },
                      },
                    },
                  ],
                  default: {
                    $dateToString: { format: "%Y-%m-%d", date: "$date" },
                  },
                },
              },
              category: {
                $ifNull: [
                  { $arrayElemAt: ["$categoryDetails.name", 0] },
                  "Uncategorized",
                ],
              },
            },
            amount: { $sum: "$amount" },
          },
        },
        {
          $sort: { "_id.period": 1 },
        },
      ])
      .toArray();

    // Process category data for chart
    const periodsSet = new Set<string>();
    const categoriesSet = new Set<string>();
    const categoryAmounts: { [key: string]: { [key: string]: number } } = {};

    interface CategoryDataItem {
      _id: { period: string; category: string };
      amount: number;
    }

    categoryData.forEach((item) => {
      const categoryItem = item as CategoryDataItem;
      const periodKey = categoryItem._id.period;
      const category = categoryItem._id.category;

      periodsSet.add(periodKey);
      categoriesSet.add(category);

      if (!categoryAmounts[category]) {
        categoryAmounts[category] = {};
      }
      categoryAmounts[category][periodKey] = categoryItem.amount;
    });

    // Generate complete period range for category chart (same as daily trends)
    let completePeriods: string[];
    if (period === "week" || period === "month" || period === "custom") {
      // For daily granularity, use the same date range as daily trends
      completePeriods = generateDateRange(startDate, endDate);
    } else if (period === "quarter" || period === "year") {
      // For monthly granularity, generate month range
      completePeriods = [];
      const current = new Date(
        startDate.getFullYear(),
        startDate.getMonth(),
        1
      );
      const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
      while (current <= end) {
        completePeriods.push(
          current.toISOString().split("T")[0].substring(0, 7)
        ); // YYYY-MM format
        current.setMonth(current.getMonth() + 1);
      }
    } else {
      completePeriods = Array.from(periodsSet).sort();
    }

    const categories = Array.from(categoriesSet);
    const chartData = categories.map((category) =>
      completePeriods.map(
        (periodKey) => categoryAmounts[category]?.[periodKey] || 0
      )
    );

    // Format period labels based on period type
    const formatPeriodLabel = (periodKey: string) => {
      if (period === "week" || period === "month" || period === "custom") {
        const date = new Date(periodKey);
        return date.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
        });
      } else if (period === "quarter" || period === "year") {
        const date = new Date(periodKey + "-01");
        return date.toLocaleDateString("en-IN", {
          month: "short",
          year: "2-digit",
        });
      }
      return periodKey;
    };

    // Get period totals for users with proper split logic
    const allExpenses = await db
      .collection("expenses")
      .find({
        date: {
          $gte: startDate,
          $lte: endDate,
        },
      })
      .toArray();

    // Calculate totals for each user
    let saketPersonal = 0;
    let ayushPersonal = 0;
    let saketSplit = 0;
    let ayushSplit = 0;

    for (const expense of allExpenses) {
      if (expense.isSplit && expense.splitDetails) {
        // For split expenses, use individual split amounts
        saketSplit += expense.splitDetails.saketAmount || 0;
        ayushSplit += expense.splitDetails.ayushAmount || 0;
      } else if (!expense.isSplit) {
        // For non-split expenses, add to personal based on who paid
        if (expense.paidBy.toLowerCase() === "saket") {
          saketPersonal += expense.amount;
        } else if (expense.paidBy.toLowerCase() === "ayush") {
          ayushPersonal += expense.amount;
        }
      }
    }

    const saketTotal = saketPersonal;
    const ayushTotal = ayushPersonal;
    const splitTotal = saketSplit + ayushSplit;

    // Calculate settlement using the same logic as settlements balance API
    // Get all split expenses (filter by date range)
    const splitExpenses = await db
      .collection("expenses")
      .find({
        isSplit: true,
        date: {
          $gte: startDate.toISOString().split("T")[0],
          $lte: endDate.toISOString().split("T")[0],
        },
      })
      .toArray();

    // Get all settlements (filter by date range)
    const settlements = await db
      .collection("settlements")
      .find({
        date: {
          $gte: startDate.toISOString().split("T")[0],
          $lte: endDate.toISOString().split("T")[0],
        },
      })
      .toArray();

    // Calculate balances for each user pair
    const balances: { [key: string]: number } = {};

    // Process split expenses based on existing expense structure
    for (const expense of splitExpenses) {
      if (expense.splitDetails) {
        // Use the existing splitDetails structure (saketAmount, ayushAmount)
        const { saketAmount = 0, ayushAmount = 0 } = expense.splitDetails;
        const paidBy = expense.paidBy;

        // Calculate what each person should pay vs what the payer paid
        if (paidBy.toLowerCase() === "saket") {
          // Saket paid, Ayush owes his portion
          if (ayushAmount > 0) {
            const key = `Ayush_to_Saket`;
            balances[key] = (balances[key] || 0) + ayushAmount;
          }
        } else if (paidBy.toLowerCase() === "ayush") {
          // Ayush paid, Saket owes his portion
          if (saketAmount > 0) {
            const key = `Saket_to_Ayush`;
            balances[key] = (balances[key] || 0) + saketAmount;
          }
        }
      } else {
        // Fallback: if no splitDetails, assume equal split between Saket and Ayush
        const amountPerPerson = expense.amount / 2;
        const paidBy = expense.paidBy;

        if (paidBy.toLowerCase() === "saket") {
          const key = `Ayush_to_Saket`;
          balances[key] = (balances[key] || 0) + amountPerPerson;
        } else if (paidBy.toLowerCase() === "ayush") {
          const key = `Saket_to_Ayush`;
          balances[key] = (balances[key] || 0) + amountPerPerson;
        }
      }
    }

    // Subtract settlements from balances
    for (const settlement of settlements) {
      const key = `${settlement.fromUser}_to_${settlement.toUser}`;
      balances[key] = (balances[key] || 0) - settlement.amount;
    }

    // Calculate net balances (show only one row per user pair)
    const saketOwesAyush = balances["Saket_to_Ayush"] || 0;
    const ayushOwesSaket = balances["Ayush_to_Saket"] || 0;

    // Calculate net difference
    const netBalance = ayushOwesSaket - saketOwesAyush;

    let settlementRequired = 0;
    let settlementMessage = "All settled up!";

    // Show only one net balance row
    if (Math.abs(netBalance) > 0.01) {
      if (netBalance > 0) {
        // Ayush owes Saket (net)
        settlementRequired = Math.round(netBalance * 100) / 100;
        settlementMessage = `Ayush owes Saket ₹${settlementRequired.toFixed(2)}`;
      } else {
        // Saket owes Ayush (net)
        settlementRequired = Math.round(Math.abs(netBalance) * 100) / 100;
        settlementMessage = `Saket owes Ayush ₹${settlementRequired.toFixed(2)}`;
      }
    }

    const dateRange = generateDateRange(startDate, endDate);
    const dailyAmountsMap = new Map(
      dailyTrends.map((d) => [d._id, d.totalAmount])
    );

    const completeDaily = {
      dates: dateRange,
      amounts: dateRange.map(
        (date) => Math.round((dailyAmountsMap.get(date) || 0) * 100) / 100
      ),
    };

    const timelineData = {
      dailyTrends: completeDaily,
      categoryMonthly: {
        categories,
        periods: completePeriods.map(formatPeriodLabel),
        data: chartData.map((categoryData) =>
          categoryData.map((amount) => Math.round(amount * 100) / 100)
        ),
      },
      periodTotals: {
        saketTotal: Math.round(saketTotal * 100) / 100,
        ayushTotal: Math.round(ayushTotal * 100) / 100,
        saketSplit: Math.round(saketSplit * 100) / 100,
        ayushSplit: Math.round(ayushSplit * 100) / 100,
        splitTotal: Math.round(splitTotal * 100) / 100,
        settlementRequired: settlementRequired,
        settlementMessage,
      },
    };

    return NextResponse.json({
      success: true,
      data: timelineData,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch timeline data" },
      { status: 500 }
    );
  }
}
