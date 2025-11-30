/**
 * Expenses Export API Route
 *
 * GET: Export expenses to CSV format
 * - Respects all filter parameters (date range, category, user, search)
 * - Returns CSV file for download
 * - Requires authentication
 */

import { NextRequest, NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { createApiRoute } from "@/lib/api-middleware";
import {
  exportExpensesToCSV,
  getExpenseExportFilename,
  createCSVResponse,
} from "@/lib/utils/export";

// GET: Export expenses to CSV
const handleExportExpenses = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request: NextRequest, context) => {
    try {
      const user = context.user!;
      const searchParams = request.nextUrl.searchParams;

      // Get filter parameters
      const userFilter = searchParams.get("user") || "all";
      const categoryFilter = searchParams.get("category");
      const startDate = searchParams.get("startDate");
      const endDate = searchParams.get("endDate");
      const search = searchParams.get("search");

      // Build query
      const db = await dbManager.getDatabase();
      const query: any = {};

      // User filter
      if (userFilter !== "all") {
        query.paidBy = userFilter;
      }

      // Category filter
      if (categoryFilter && categoryFilter !== "all") {
        query.category = categoryFilter;
      }

      // Date range filter
      if (startDate || endDate) {
        query.date = {};
        if (startDate) {
          query.date.$gte = new Date(startDate);
        }
        if (endDate) {
          query.date.$lte = new Date(endDate);
        }
      }

      // Search filter
      if (search) {
        query.description = { $regex: search, $options: "i" };
      }

      // Fetch expenses
      const expenses = await db
        .collection("expenses")
        .find(query)
        .sort({ date: -1 })
        .toArray();

      // Transform data for export
      const exportData = expenses.map((expense) => ({
        _id: expense._id.toString(),
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        category: expense.category,
        categoryName: expense.categoryName,
        paidBy: expense.paidBy,
        isSplit: expense.isSplit,
        splitDetails: expense.splitDetails,
      }));

      // Generate CSV
      const csvContent = exportExpensesToCSV(exportData);

      // Generate filename
      const filename = getExpenseExportFilename({
        user: userFilter !== "all" ? userFilter : undefined,
      });

      // Return CSV response (using NextResponse for compatibility)
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          "Content-Type": "text/csv;charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
          "Cache-Control": "no-cache",
        },
      }) as any;
    } catch (error: any) {
      return new NextResponse(
        JSON.stringify({ success: false, error: "Failed to export expenses" }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      ) as any;
    }
  },
});

// Export route handler
export const GET = handleExportExpenses;
