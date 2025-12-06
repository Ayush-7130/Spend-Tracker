/**
 * Export Utilities
 *
 * Functions for exporting data to CSV and Excel formats.
 */

import { formatDate } from "./date";

// ===========================================================================
// CSV GENERATION
// ===========================================================================

/**
 * Convert array of objects to CSV string
 */
export function arrayToCSV<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    key: keyof T;
    label: string;
    format?: (value: any, row: T) => string;
  }>
): string {
  if (data.length === 0) {
    return "";
  }

  // Create header row
  const headers = columns.map((col) => escapeCSVValue(col.label));
  const headerRow = headers.join(",");

  // Create data rows
  const dataRows = data.map((row) => {
    const values = columns.map((col) => {
      const value = row[col.key];
      const formattedValue = col.format
        ? col.format(value, row)
        : String(value ?? "");
      return escapeCSVValue(formattedValue);
    });
    return values.join(",");
  });

  return [headerRow, ...dataRows].join("\n");
}

/**
 * Escape CSV value (handle commas, quotes, newlines)
 */
function escapeCSVValue(value: string): string {
  // Convert to string and handle null/undefined
  const stringValue = String(value ?? "");

  // Check if value needs escaping
  const needsEscaping = /[",\n\r]/.test(stringValue);

  if (needsEscaping) {
    // Escape double quotes by doubling them
    const escapedValue = stringValue.replace(/"/g, '""');
    // Wrap in double quotes
    return `"${escapedValue}"`;
  }

  return stringValue;
}

/**
 * Download CSV file in browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}

// ===========================================================================
// EXPENSE EXPORT
// ===========================================================================

export interface ExpenseExportData {
  _id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
  paidBy: string;
  isSplit?: boolean;
  categoryName?: string;
  splitDetails?: {
    saketAmount?: number;
    ayushAmount?: number;
  };
}

/**
 * Generate CSV for expenses
 */
export function exportExpensesToCSV(expenses: ExpenseExportData[]): string {
  return arrayToCSV(expenses, [
    {
      key: "date",
      label: "Date",
      format: (value) => formatDate(value, { dateStyle: "short" }),
    },
    { key: "description", label: "Description" },
    {
      key: "categoryName",
      label: "Category",
      format: (value, row) => value || row.category,
    },
    {
      key: "amount",
      label: "Amount (INR)",
      format: (value) => value.toString(),
    },
    {
      key: "paidBy",
      label: "Paid By",
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      key: "isSplit",
      label: "Type",
      format: (value) => (value ? "Split" : "Personal"),
    },
    {
      key: "splitDetails",
      label: "Saket Amount (INR)",
      format: (value, row) =>
        row.isSplit && value?.saketAmount ? value.saketAmount.toString() : "",
    },
    {
      key: "splitDetails",
      label: "Ayush Amount (INR)",
      format: (value, row) =>
        row.isSplit && value?.ayushAmount ? value.ayushAmount.toString() : "",
    },
  ]);
}

/**
 * Generate filename for expense export
 */
export function getExpenseExportFilename(
  filters?: Record<string, any>
): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const filterSuffix = filters?.user ? `_${filters.user}` : "";
  return `expenses${filterSuffix}_${timestamp}.csv`;
}

// ===========================================================================
// SETTLEMENT EXPORT
// ===========================================================================

export interface SettlementExportData {
  _id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date: string;
  status?: string;
}

/**
 * Generate CSV for settlements
 */
export function exportSettlementsToCSV(
  settlements: SettlementExportData[]
): string {
  return arrayToCSV(settlements, [
    {
      key: "date",
      label: "Date",
      format: (value) => formatDate(value, { dateStyle: "short" }),
    },
    {
      key: "fromUser",
      label: "From",
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      key: "toUser",
      label: "To",
      format: (value) => value.charAt(0).toUpperCase() + value.slice(1),
    },
    {
      key: "amount",
      label: "Amount (INR)",
      format: (value) => value.toString(),
    },
    {
      key: "description",
      label: "Description",
      format: (value) => value || "N/A",
    },
    {
      key: "status",
      label: "Status",
      format: (value) =>
        value ? value.charAt(0).toUpperCase() + value.slice(1) : "Completed",
    },
  ]);
}

/**
 * Generate filename for settlement export
 */
export function getSettlementExportFilename(): string {
  const timestamp = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `settlements_${timestamp}.csv`;
}

// ===========================================================================
// RESPONSE HELPERS
// ===========================================================================

/**
 * Create CSV download response
 */
export function createCSVResponse(
  csvContent: string,
  filename: string
): Response {
  return new Response(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv;charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-cache",
    },
  });
}

/**
 * Format export summary
 */
export function formatExportSummary(
  count: number,
  type: "expenses" | "settlements"
): string {
  return `Exported ${count} ${type}`;
}
