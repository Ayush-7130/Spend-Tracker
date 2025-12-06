/**
 * TableCard Preset Configurations
 *
 * Ready-to-use configurations for common table/card displays.
 * These presets follow the app's design patterns and can be easily customized.
 */

import {
  createTableCardColumn,
  createTableCardConfig,
  TableCardConfig,
} from "./config";
import { formatCurrency } from "@/lib/utils/currency";
import { formatDate } from "@/lib/utils/date";

/**
 * Expenses Table Card Configuration
 *
 * Usage:
 * ```tsx
 * <TableCard
 *   data={expenses}
 *   config={expensesTableCardConfig}
 *   onRowClick={handleExpenseClick}
 * />
 * ```
 */
export const expensesTableCardConfig: TableCardConfig<any> =
  createTableCardConfig({
    columns: [
      createTableCardColumn({
        key: "description",
        label: "Description",
        isPrimary: true,
        position: "header",
        order: 0,
        icon: "bi-receipt",
      }),
      createTableCardColumn({
        key: "amount",
        label: "Amount",
        isSecondary: true,
        position: "header",
        order: 1,
        icon: "bi-currency-rupee",
        render: (item) => formatCurrency(item.amount),
        className: "fw-bold text-primary",
      }),
      createTableCardColumn({
        key: "date",
        label: "Date",
        position: "body",
        order: 0,
        icon: "bi-calendar",
        format: (value) => formatDate(value, { dateStyle: "medium" }),
      }),
      createTableCardColumn({
        key: "category",
        label: "Category",
        position: "body",
        order: 1,
        icon: "bi-tag",
        render: (item) => item.categoryName || item.category,
      }),
      createTableCardColumn({
        key: "paidBy",
        label: "Paid By",
        position: "body",
        order: 2,
        icon: "bi-person",
        render: (item) => (
          <span className="badge bg-primary">{item.paidBy}</span>
        ),
      }),
      createTableCardColumn({
        key: "isSplit",
        label: "Split",
        position: "body",
        order: 3,
        icon: "bi-distribute-vertical",
        render: (item) =>
          item.isSplit ? (
            <span className="badge bg-info">
              <i className="bi bi-distribute-vertical me-1"></i>
              Split
            </span>
          ) : (
            <span className="badge bg-secondary">
              <i className="bi bi-person-fill me-1"></i>
              Personal
            </span>
          ),
      }),
      createTableCardColumn({
        key: "actions",
        label: "Actions",
        position: "footer",
        order: 0,
        hideInCard: false,
        render: () => null, // Actions will be provided by parent component
      }),
    ],
    cardBreakpoint: 768,
    enableCardView: true,
    showDividers: true,
    showLabels: true,
    fieldGap: 0.75,
  });

/**
 * Settlements Table Card Configuration
 *
 * Usage:
 * ```tsx
 * <TableCard
 *   data={settlements}
 *   config={settlementsTableCardConfig}
 *   onRowClick={handleSettlementClick}
 * />
 * ```
 */
export const settlementsTableCardConfig: TableCardConfig<any> =
  createTableCardConfig({
    columns: [
      createTableCardColumn({
        key: "description",
        label: "Description",
        isPrimary: true,
        position: "header",
        order: 0,
        icon: "bi-currency-exchange",
        render: (item) =>
          item.description ||
          `Settlement from ${item.fromUser} to ${item.toUser}`,
      }),
      createTableCardColumn({
        key: "amount",
        label: "Amount",
        isSecondary: true,
        position: "header",
        order: 1,
        icon: "bi-currency-rupee",
        render: (item) => formatCurrency(item.amount),
        className: "fw-bold text-success",
      }),
      createTableCardColumn({
        key: "date",
        label: "Date",
        position: "body",
        order: 0,
        icon: "bi-calendar",
        format: (value) => formatDate(value, { dateStyle: "medium" }),
      }),
      createTableCardColumn({
        key: "fromUser",
        label: "From",
        position: "body",
        order: 1,
        icon: "bi-arrow-right-circle",
        render: (item) => (
          <span className="badge bg-danger">{item.fromUser}</span>
        ),
      }),
      createTableCardColumn({
        key: "toUser",
        label: "To",
        position: "body",
        order: 2,
        icon: "bi-arrow-left-circle",
        render: (item) => (
          <span className="badge bg-success">{item.toUser}</span>
        ),
      }),
      createTableCardColumn({
        key: "status",
        label: "Status",
        position: "body",
        order: 3,
        icon: "bi-check-circle",
        render: () => (
          <span className="badge bg-success">
            <i className="bi bi-check-circle me-1"></i>
            Completed
          </span>
        ),
      }),
      createTableCardColumn({
        key: "actions",
        label: "Actions",
        position: "footer",
        order: 0,
        hideInCard: false,
        render: () => null, // Actions will be provided by parent component
      }),
    ],
    cardBreakpoint: 768,
    enableCardView: true,
    showDividers: true,
    showLabels: true,
    fieldGap: 0.75,
  });

/**
 * Categories Table Card Configuration
 *
 * Usage:
 * ```tsx
 * <TableCard
 *   data={categories}
 *   config={categoriesTableCardConfig}
 *   onRowClick={handleCategoryClick}
 * />
 * ```
 */
export const categoriesTableCardConfig: TableCardConfig<any> =
  createTableCardConfig({
    columns: [
      createTableCardColumn({
        key: "name",
        label: "Category Name",
        isPrimary: true,
        position: "header",
        order: 0,
        icon: "bi-tag",
      }),
      createTableCardColumn({
        key: "description",
        label: "Description",
        isSecondary: true,
        position: "header",
        order: 1,
        render: (item) => item.description || "No description",
      }),
      createTableCardColumn({
        key: "subcategories",
        label: "Subcategories",
        position: "body",
        order: 0,
        icon: "bi-list-nested",
        render: (item) => {
          const count = item.subcategories?.length || 0;
          return count > 0 ? (
            <span
              className="badge"
              style={{
                backgroundColor: "var(--btn-primary-bg)",
                color: "var(--text-inverse)",
              }}
            >
              {count} subcategories
            </span>
          ) : (
            <span style={{ color: "var(--text-secondary)" }}>None</span>
          );
        },
      }),
      createTableCardColumn({
        key: "actions",
        label: "Actions",
        position: "footer",
        order: 0,
        hideInCard: false,
        render: () => null, // Actions will be provided by parent component
      }),
    ],
    cardBreakpoint: 768,
    enableCardView: true,
    showDividers: false,
    showLabels: true,
    fieldGap: 0.75,
  });

/**
 * Analytics Users Table Card Configuration
 *
 * Usage:
 * ```tsx
 * <TableCard
 *   data={users}
 *   config={analyticsUsersTableCardConfig}
 *   onRowClick={handleUserClick}
 * />
 * ```
 */
export const analyticsUsersTableCardConfig: TableCardConfig<any> =
  createTableCardConfig({
    columns: [
      createTableCardColumn({
        key: "name",
        label: "User",
        isPrimary: true,
        position: "header",
        order: 0,
        icon: "bi-person",
        render: (item) => (
          <span className="badge bg-primary">
            <i className="bi bi-person-fill me-1"></i>
            {item.name || item.userName}
          </span>
        ),
      }),
      createTableCardColumn({
        key: "totalAmount",
        label: "Total Spent",
        isSecondary: true,
        position: "header",
        order: 1,
        icon: "bi-currency-rupee",
        render: (item) => formatCurrency(item.totalAmount || item.total),
        className: "fw-bold text-primary",
      }),
      createTableCardColumn({
        key: "expenseCount",
        label: "Expenses",
        position: "body",
        order: 0,
        icon: "bi-list-ul",
        render: (item) => (
          <span className="badge bg-info">
            {item.expenseCount || item.count} transactions
          </span>
        ),
      }),
      createTableCardColumn({
        key: "avgExpense",
        label: "Avg. Expense",
        position: "body",
        order: 1,
        icon: "bi-calculator",
        render: (item) => {
          const avg =
            (item.totalAmount || item.total) /
            (item.expenseCount || item.count || 1);
          return formatCurrency(avg);
        },
      }),
    ],
    cardBreakpoint: 768,
    enableCardView: true,
    showDividers: true,
    showLabels: true,
    fieldGap: 0.75,
    compact: true,
  });

/**
 * Helper function to add actions column to any configuration
 */
export function withActions<TData = any>(
  config: TableCardConfig<TData>,
  renderActions: (item: TData) => React.ReactNode
): TableCardConfig<TData> {
  return {
    ...config,
    columns: config.columns.map((col) =>
      col.key === "actions" ? { ...col, render: renderActions } : col
    ),
  };
}

/**
 * Helper function to customize column rendering
 */
export function customizeColumn<TData = any>(
  config: TableCardConfig<TData>,
  columnKey: string,
  customizations: Partial<(typeof config.columns)[0]>
): TableCardConfig<TData> {
  return {
    ...config,
    columns: config.columns.map((col) =>
      col.key === columnKey ? { ...col, ...customizations } : col
    ),
  };
}
