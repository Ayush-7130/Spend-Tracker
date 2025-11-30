/**
 * TableCard Component
 *
 * A responsive component that displays data as a table on desktop (>1024px)
 * and as stacked cards on mobile/tablet devices (<=1024px).
 *
 * Features:
 * - Automatic responsive layout switching
 * - Custom column render functions
 * - Action buttons without checkboxes
 * - Custom mobile card layouts
 * - Empty state support
 *
 * Usage:
 * ```tsx
 * <TableCard
 *   data={expenses}
 *   columns={[
 *     { key: 'date', label: 'Date', render: (item) => formatDate(item.date) },
 *     { key: 'description', label: 'Description', render: (item) => item.description },
 *     { key: 'amount', label: 'Amount', render: (item) => formatCurrency(item.amount) },
 *   ]}
 *   actions={[
 *     { label: 'Edit', onClick: (item) => handleEdit(item), variant: 'secondary' },
 *     { label: 'Delete', onClick: (item) => handleDelete(item), variant: 'danger' },
 *   ]}
 *   mobileCardRender={(item) => ({
 *     title: item.description,
 *     subtitle: formatDate(item.date),
 *     amount: formatCurrency(item.amount),
 *     meta: item.category
 *   })}
 *   emptyMessage="No expenses found"
 * />
 * ```
 */

"use client";

import React from "react";
import styles from "./TableCard.module.css";

export interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
}

export interface Action<T> {
  label: string;
  onClick: (item: T) => void;
  variant?: "primary" | "secondary" | "danger";
  icon?: string;
}

export interface MobileCardData {
  title: string;
  subtitle?: string;
  amount?: string;
  meta?: string;
  badge?: React.ReactNode;
}

export interface TableCardProps<T> {
  /**
   * Array of data items to display
   */
  data: T[];

  /**
   * Column definitions for table view
   */
  columns: Column<T>[];

  /**
   * Action buttons for each row/card
   */
  actions?: Action<T>[];

  /**
   * Function to render mobile card layout
   */
  mobileCardRender: (item: T) => MobileCardData;

  /**
   * Empty state message
   */
  emptyMessage?: string;

  /**
   * Empty state action button
   */
  emptyAction?: {
    label: string;
    onClick: () => void;
  };

  /**
   * Loading state
   */
  loading?: boolean;

  /**
   * Custom class name for container
   */
  className?: string;
}

export function TableCard<T>({
  data,
  columns,
  actions,
  mobileCardRender,
  emptyMessage = "No data available",
  emptyAction,
  loading = false,
  className = "",
}: TableCardProps<T>) {
  // Render loading state
  if (loading) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.loadingSpinner}>
          <div className={styles.spinner} />
        </div>
      </div>
    );
  }

  // Render empty state
  if (data.length === 0) {
    return (
      <div className={`${styles.container} ${className}`}>
        <div className={styles.emptyState}>
          <div className={styles.emptyStateIcon}>
            <i className="bi bi-inbox"></i>
          </div>
          <div className={styles.emptyStateMessage}>{emptyMessage}</div>
          {emptyAction && (
            <button
              className={styles.emptyStateButton}
              onClick={emptyAction.onClick}
            >
              {emptyAction.label}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.container} ${className}`}>
      {/* Desktop Table View */}
      <div className={styles.tableContainer}>
        <table className={styles.table}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col.key}>{col.label}</th>
              ))}
              {actions && actions.length > 0 && <th>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr key={index}>
                {columns.map((col) => (
                  <td key={col.key}>{col.render(item)}</td>
                ))}
                {actions && actions.length > 0 && (
                  <td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {actions.map((action, actionIndex) => (
                        <button
                          key={actionIndex}
                          type="button"
                          className={`${styles.actionButton} ${
                            styles[action.variant || "secondary"]
                          }`}
                          onClick={() => action.onClick(item)}
                        >
                          {action.icon && <i className={action.icon}></i>}
                          {action.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet Card View */}
      <div className={styles.cardsContainer}>
        {data.map((item, index) => {
          const cardData = mobileCardRender(item);

          return (
            <div key={index} className={styles.card}>
              <div className={styles.cardHeader}>
                <div className={styles.cardHeaderLeft}>
                  {cardData.subtitle && (
                    <span className={styles.cardDate}>{cardData.subtitle}</span>
                  )}
                </div>
                {cardData.badge && <div>{cardData.badge}</div>}
              </div>

              <div className={styles.cardBody}>
                <div className={styles.cardTitle}>{cardData.title}</div>
                {cardData.amount && (
                  <div className={styles.cardAmount}>{cardData.amount}</div>
                )}
                {cardData.meta && (
                  <div className={styles.cardMeta}>{cardData.meta}</div>
                )}
              </div>

              {actions && actions.length > 0 && (
                <div className={styles.cardActions}>
                  {actions.map((action, actionIndex) => (
                    <button
                      key={actionIndex}
                      type="button"
                      className={`${styles.actionButton} ${
                        styles[action.variant || "secondary"]
                      }`}
                      onClick={() => action.onClick(item)}
                    >
                      {action.icon && <i className={action.icon}></i>}
                      {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default TableCard;
