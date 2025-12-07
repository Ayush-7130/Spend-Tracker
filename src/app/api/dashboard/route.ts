import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get("user") || "all"; // Default to all

    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Get total expenses for the selected user(s)
    let totalExpenses = 0;
    let totalExpenseCount = 0;

    if (user === "all") {
      // For all users, sum all expenses
      const totalExpensesResult = await db
        .collection("expenses")
        .aggregate([
          {
            $group: {
              _id: null,
              totalAmount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
        ])
        .toArray();

      totalExpenses = totalExpensesResult[0]?.totalAmount || 0;
      totalExpenseCount = totalExpensesResult[0]?.count || 0;
    } else {
      // For individual users, calculate based on split logic
      const allExpenses = await db.collection("expenses").find({}).toArray();

      for (const expense of allExpenses) {
        if (expense.isSplit && expense.splitDetails) {
          // For split expenses, add only the user's portion
          const userLower = user.toLowerCase();
          if (userLower === "saket" && expense.splitDetails.saketAmount) {
            totalExpenses += expense.splitDetails.saketAmount;
            totalExpenseCount++;
          } else if (
            userLower === "ayush" &&
            expense.splitDetails.ayushAmount
          ) {
            totalExpenses += expense.splitDetails.ayushAmount;
            totalExpenseCount++;
          }
        } else if (
          !expense.isSplit &&
          expense.paidBy.toLowerCase() === user.toLowerCase()
        ) {
          // For non-split expenses, add full amount if user paid
          totalExpenses += expense.amount;
          totalExpenseCount++;
        }
      }
    }

    // Get this month's expenses for the selected user(s)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let thisMonthTotal = 0;
    let thisMonthCount = 0;

    if (user === "all") {
      const thisMonthMatch = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth,
        },
      };

      const thisMonthResult = await db
        .collection("expenses")
        .aggregate([
          {
            $match: thisMonthMatch,
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

      thisMonthTotal = thisMonthResult[0]?.totalAmount || 0;
      thisMonthCount = thisMonthResult[0]?.count || 0;
    } else {
      // For individual users, calculate this month based on split logic
      const thisMonthExpenses = await db
        .collection("expenses")
        .find({
          date: {
            $gte: startOfMonth,
            $lte: endOfMonth,
          },
        })
        .toArray();

      for (const expense of thisMonthExpenses) {
        if (expense.isSplit && expense.splitDetails) {
          // For split expenses, add only the user's portion
          const userLower = user.toLowerCase();
          if (userLower === "saket" && expense.splitDetails.saketAmount) {
            thisMonthTotal += expense.splitDetails.saketAmount;
            thisMonthCount++;
          } else if (
            userLower === "ayush" &&
            expense.splitDetails.ayushAmount
          ) {
            thisMonthTotal += expense.splitDetails.ayushAmount;
            thisMonthCount++;
          }
        } else if (
          !expense.isSplit &&
          expense.paidBy.toLowerCase() === user.toLowerCase()
        ) {
          // For non-split expenses, add full amount if user paid
          thisMonthTotal += expense.amount;
          thisMonthCount++;
        }
      }
    }

    // Get categories count
    const categoriesCount = await db.collection("categories").countDocuments();

    // Calculate settlement using the new settlements collection
    let settlementAmount = 0;
    let settlementMessage = "All settled up!";

    if (user !== "all") {
      // Get all split expenses from expenses collection
      const splitExpenses = await db
        .collection("expenses")
        .find({ isSplit: true })
        .toArray();

      // Get all settlements
      const settlements = await db.collection("settlements").find({}).toArray();

      // Calculate balances for this user
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

      // Calculate net balance for the current user (net difference approach)
      const saketOwesAyush = balances["Saket_to_Ayush"] || 0;
      const ayushOwesSaket = balances["Ayush_to_Saket"] || 0;

      // Calculate net difference
      const netBalance = ayushOwesSaket - saketOwesAyush;

      if (user.toLowerCase() === "saket") {
        if (netBalance > 0.01) {
          // Net: Ayush owes Saket
          settlementAmount = netBalance;
          settlementMessage = `Ayush owes you ₹${netBalance.toFixed(2)}`;
        } else if (netBalance < -0.01) {
          // Net: Saket owes Ayush
          settlementAmount = Math.abs(netBalance);
          settlementMessage = `You owe Ayush ₹${Math.abs(netBalance).toFixed(2)}`;
        } else {
          settlementAmount = 0;
          settlementMessage = "All settled up!";
        }
      } else if (user.toLowerCase() === "ayush") {
        if (netBalance > 0.01) {
          // Net: Ayush owes Saket
          settlementAmount = netBalance;
          settlementMessage = `You owe Saket ₹${netBalance.toFixed(2)}`;
        } else if (netBalance < -0.01) {
          // Net: Saket owes Ayush
          settlementAmount = Math.abs(netBalance);
          settlementMessage = `Saket owes you ₹${Math.abs(netBalance).toFixed(2)}`;
        } else {
          settlementAmount = 0;
          settlementMessage = "All settled up!";
        }
      }
    } else {
      settlementMessage = "View individual users for settlement details";
    }

    // Get recent expenses for the selected user(s) (last 5)
    let recentExpenses;

    if (user === "all") {
      // For all users, show all recent expenses
      recentExpenses = await db
        .collection("expenses")
        .aggregate([
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          {
            $sort: { date: -1 },
          },
          {
            $limit: 5,
          },
          {
            $project: {
              amount: 1,
              description: 1,
              date: 1,
              category: 1,
              paidBy: 1,
              isSplit: 1,
              categoryName: { $arrayElemAt: ["$categoryDetails.name", 0] },
            },
          },
        ])
        .toArray();
    } else {
      // For individual users, show expenses they're involved in
      const allRecentExpenses = await db
        .collection("expenses")
        .aggregate([
          {
            $lookup: {
              from: "categories",
              localField: "category",
              foreignField: "_id",
              as: "categoryDetails",
            },
          },
          {
            $sort: { date: -1 },
          },
          {
            $project: {
              amount: 1,
              description: 1,
              date: 1,
              category: 1,
              paidBy: 1,
              isSplit: 1,
              splitDetails: 1,
              categoryName: { $arrayElemAt: ["$categoryDetails.name", 0] },
            },
          },
        ])
        .toArray();

      // Filter and limit to expenses paid by the user only
      recentExpenses = allRecentExpenses
        .filter((expense) => {
          // Include only if user paid for it
          return expense.paidBy.toLowerCase() === user.toLowerCase();
        })
        .slice(0, 5);
    }

    // Get users list (hardcoded for now, but could be from database)
    const users = [
      { id: "saket", name: "Saket" },
      { id: "ayush", name: "Ayush" },
    ];

    const dashboardData = {
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      totalExpenseCount,
      thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
      thisMonthCount,
      categoriesCount,
      settlementAmount: Math.round(settlementAmount * 100) / 100,
      settlementMessage,
      users,
      recentExpenses,
    };

    // Return response with no-cache headers
    const response = NextResponse.json({
      success: true,
      data: dashboardData,
    });

    // Prevent any caching
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, max-age=0"
    );
    response.headers.set("Pragma", "no-cache");
    response.headers.set("Expires", "0");

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
