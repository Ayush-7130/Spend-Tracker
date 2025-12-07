import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// Disable Next.js caching for this route
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db("spend-tracker");

    // Get all split expenses from expenses collection with error handling
    let splitExpenses: any[] = [];
    try {
      splitExpenses = await db
        .collection("expenses")
        .find({ isSplit: true })
        .toArray();
    } catch {
      splitExpenses = [];
    }

    // Get all settlements with error handling
    let settlements: any[] = [];
    try {
      settlements = await db.collection("settlements").find({}).toArray();
    } catch {
      settlements = [];
    }

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

    const userBalances: Array<{
      fromUser: string;
      toUser: string;
      amount: number;
      status: "owes" | "settled";
    }> = [];

    // Show only one net balance row
    if (Math.abs(netBalance) > 0.01) {
      if (netBalance > 0) {
        // Ayush owes Saket (net)
        userBalances.push({
          fromUser: "Ayush",
          toUser: "Saket",
          amount: Math.round(netBalance * 100) / 100,
          status: "owes",
        });
      } else {
        // Saket owes Ayush (net)
        userBalances.push({
          fromUser: "Saket",
          toUser: "Ayush",
          amount: Math.round(Math.abs(netBalance) * 100) / 100,
          status: "owes",
        });
      }
    }

    // Calculate summary statistics with safe arithmetic
    let totalOwed = 0;
    let totalSettled = 0;

    try {
      totalOwed = userBalances
        .filter((b) => b.status === "owes")
        .reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
    } catch {
      totalOwed = 0;
    }

    try {
      totalSettled = settlements.reduce(
        (sum, s) => sum + (Number(s.amount) || 0),
        0
      );
    } catch {
      totalSettled = 0;
    }

    const response = NextResponse.json({
      balances: userBalances,
      summary: {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalSettled: Math.round(totalSettled * 100) / 100,
        totalTransactions: settlements.length,
        activeBalances: userBalances.filter((b) => b.status === "owes").length,
      },
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
      { error: "Failed to calculate balances" },
      { status: 500 }
    );
  }
}
