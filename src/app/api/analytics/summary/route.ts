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

    // Get total expenses by person
    const expensesByPerson = await db
      .collection("expenses")
      .aggregate([
        {
          $group: {
            _id: "$paidBy",
            totalPaid: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    // Get split expenses and calculate settlement
    const splitExpenses = await db
      .collection("expenses")
      .find({
        isSplit: true,
      })
      .toArray();

    let saketPersonal = 0;
    let ayushPersonal = 0;
    let totalSplit = 0;
    let saketSplitPaid = 0;
    let ayushSplitPaid = 0;
    let saketSplitOwes = 0;
    let ayushSplitOwes = 0;

    // Calculate personal expenses
    expensesByPerson.forEach((person) => {
      if (person._id === "saket") {
        saketPersonal = person.totalPaid;
      } else if (person._id === "ayush") {
        ayushPersonal = person.totalPaid;
      }
    });

    // Calculate split totals and individual shares
    splitExpenses.forEach((expense) => {
      totalSplit += expense.amount;

      if (expense.paidBy === "saket") {
        saketSplitPaid += expense.amount;
      } else {
        ayushSplitPaid += expense.amount;
      }

      if (expense.splitDetails) {
        saketSplitOwes += expense.splitDetails.saketAmount || 0;
        ayushSplitOwes += expense.splitDetails.ayushAmount || 0;
      }
    });

    // Subtract split expenses from personal totals
    saketPersonal -= saketSplitPaid;
    ayushPersonal -= ayushSplitPaid;

    // Calculate settlement
    const saketNetBalance = saketSplitPaid - saketSplitOwes;
    const ayushNetBalance = ayushSplitPaid - ayushSplitOwes;

    const settlement = {
      saketOwes: 0,
      ayushOwes: 0,
      status: "Settled",
    };

    if (saketNetBalance > 0) {
      settlement.ayushOwes = saketNetBalance;
      settlement.status = `Ayush owes Saket ₹${saketNetBalance.toFixed(2)}`;
    } else if (ayushNetBalance > 0) {
      settlement.saketOwes = ayushNetBalance;
      settlement.status = `Saket owes Ayush ₹${ayushNetBalance.toFixed(2)}`;
    }

    // Get this month's expenses
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthExpenses = await db
      .collection("expenses")
      .aggregate([
        {
          $match: {
            date: {
              $gte: startOfMonth,
              $lte: endOfMonth,
            },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray();

    const thisMonthTotal = thisMonthExpenses[0]?.total || 0;
    const thisMonthCount = thisMonthExpenses[0]?.count || 0;

    return NextResponse.json({
      success: true,
      data: {
        saketPersonal: Math.round(saketPersonal * 100) / 100,
        ayushPersonal: Math.round(ayushPersonal * 100) / 100,
        totalSplit: Math.round(totalSplit * 100) / 100,
        thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
        thisMonthCount,
        settlement,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics summary" },
      { status: 500 }
    );
  }
}
