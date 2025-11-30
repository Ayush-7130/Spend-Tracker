/**
 * Memoized Expense Row Component
 *
 * Optimized table row component to prevent unnecessary re-renders.
 */

"use client";

import React, { memo } from "react";
import { UserBadge, StatusBadge } from "@/shared/components";
import { formatCurrency, formatDate } from "@/lib/utils";
import { useTheme } from "@/contexts/ThemeContext";
import { lightTheme, darkTheme } from "@/styles/colors";

interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  paidBy: string;
  isSplit: boolean;
  splitDetails?: {
    type: string;
    saketAmount: number;
    ayushAmount: number;
  };
}

interface ExpenseRowProps {
  expense: Expense;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (id: string) => void;
}

/**
 * Memoized expense row component
 * Only re-renders when expense data or selection state changes
 */
export const ExpenseRow = memo<ExpenseRowProps>(
  ({ expense, isSelected, onSelect, onEdit, onDelete }) => {
    const { theme } = useTheme();
    const colors = theme === "light" ? lightTheme : darkTheme;

    return (
      <tr>
        <td>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect(expense._id)}
            aria-label={`Select expense ${expense.description}`}
          />
        </td>
        <td>{formatDate(expense.date)}</td>
        <td>{formatCurrency(expense.amount)}</td>
        <td>{expense.description}</td>
        <td>
          <span
            className="badge"
            style={{
              backgroundColor: colors.button.secondary.background,
              color: colors.button.secondary.text,
              padding: "0.375rem 0.75rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 500,
              fontSize: "0.75rem",
            }}
          >
            {expense.category}
          </span>
          {expense.subcategory && (
            <span
              className="badge ms-1"
              style={{
                backgroundColor: colors.background.tertiary,
                color: colors.text.primary,
                border: `1px solid ${colors.border.secondary}`,
                padding: "0.375rem 0.75rem",
                borderRadius: "var(--radius-sm)",
                fontWeight: 500,
                fontSize: "0.75rem",
              }}
            >
              {expense.subcategory}
            </span>
          )}
        </td>
        <td>
          <UserBadge user={expense.paidBy as "saket" | "ayush"} />
        </td>
        <td>
          <StatusBadge
            status={expense.isSplit ? "split" : "personal"}
            type="split"
          />
        </td>
        <td>
          <div className="btn-group" role="group">
            <button
              type="button"
              className="btn btn-sm"
              style={{
                backgroundColor: colors.button.secondary.background,
                color: colors.button.secondary.text,
                borderColor: colors.button.secondary.border,
                border: "1px solid",
              }}
              onClick={() => onEdit(expense)}
              aria-label={`Edit expense ${expense.description}`}
            >
              <i className="bi bi-pencil" aria-hidden="true"></i>
            </button>
            <button
              type="button"
              className="btn btn-sm"
              style={{
                backgroundColor: colors.status.error,
                color: colors.text.inverse,
                borderColor: colors.status.error,
                border: "1px solid",
              }}
              onClick={() => onDelete(expense._id)}
              aria-label={`Delete expense ${expense.description}`}
            >
              <i className="bi bi-trash" aria-hidden="true"></i>
            </button>
          </div>
        </td>
      </tr>
    );
  },
  // Custom comparison function - only re-render if these props change
  (prevProps, nextProps) => {
    return (
      prevProps.expense._id === nextProps.expense._id &&
      prevProps.expense.amount === nextProps.expense.amount &&
      prevProps.expense.description === nextProps.expense.description &&
      prevProps.expense.date === nextProps.expense.date &&
      prevProps.expense.category === nextProps.expense.category &&
      prevProps.expense.subcategory === nextProps.expense.subcategory &&
      prevProps.expense.paidBy === nextProps.expense.paidBy &&
      prevProps.expense.isSplit === nextProps.expense.isSplit &&
      prevProps.isSelected === nextProps.isSelected
    );
  }
);

ExpenseRow.displayName = "ExpenseRow";

export default ExpenseRow;
