/**
 * Table Utilities
 *
 * Shared table configurations, column definitions, and utilities
 * to reduce duplication across expense and settlement tables.
 */

import { formatCurrency } from "./currency";
import { formatDate } from "./date";

// ===========================================================================
// TYPES
// ===========================================================================

export interface Column<T = any> {
  /** Column key/accessor */
  key: string;
  /** Column header label */
  label: string;
  /** Render cell value */
  render?: (item: T) => React.ReactNode;
  /** Is column sortable */
  sortable?: boolean;
  /** Column width */
  width?: string;
  /** Column alignment */
  align?: "left" | "center" | "right";
  /** Is column visible by default */
  visible?: boolean;
  /** Custom className for column */
  className?: string;
}

export interface TableAction<T = any> {
  /** Action label */
  label: string;
  /** Action icon (Bootstrap icon class) */
  icon?: string;
  /** Action handler */
  onClick: (item: T) => void;
  /** Action variant/color */
  variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info";
  /** Condition to show action */
  show?: (item: T) => boolean;
  /** Is action loading */
  loading?: boolean;
}

export interface SortState {
  field: string;
  direction: "asc" | "desc";
}

export interface PaginationConfig {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ===========================================================================
// COMMON COLUMN DEFINITIONS
// ===========================================================================

/**
 * Date column configuration
 */
export function createDateColumn<T>(
  key: string,
  label: string = "Date",
  format: "full" | "short" | "relative" = "short"
): Column<T> {
  const dateOptions: Intl.DateTimeFormatOptions =
    format === "full"
      ? { day: "2-digit", month: "short", year: "numeric" }
      : { day: "2-digit", month: "short" };

  return {
    key,
    label,
    sortable: true,
    render: (item: any) => formatDate(item[key], dateOptions),
    width: "120px",
  };
}

/**
 * Amount/Currency column configuration
 */
export function createAmountColumn<T>(
  key: string,
  label: string = "Amount",
  options?: {
    colorize?: boolean;
    showSign?: boolean;
  }
): Column<T> {
  const { colorize = false, showSign = false } = options || {};

  return {
    key,
    label,
    sortable: true,
    align: "right",
    width: "120px",
    render: (item: any) => {
      const amount = item[key];
      const formatted = formatCurrency(Math.abs(amount));
      const display = showSign && amount > 0 ? `+${formatted}` : formatted;

      if (colorize) {
        const className =
          amount > 0 ? "text-success" : amount < 0 ? "text-danger" : "";
        return <span className={className}>{display}</span>;
      }

      return display;
    },
  };
}

/**
 * User/Name column configuration
 */
export function createUserColumn<T>(
  key: string,
  label: string = "User",
  options?: {
    showBadge?: boolean;
  }
): Column<T> {
  const { showBadge = false } = options || {};

  return {
    key,
    label,
    sortable: true,
    width: "150px",
    render: (item: any) => {
      const value = item[key];

      if (showBadge) {
        const color = value.toLowerCase() === "saket" ? "primary" : "success";
        return (
          <span className={`badge bg-${color}`}>
            {value.charAt(0).toUpperCase() + value.slice(1)}
          </span>
        );
      }

      return value.charAt(0).toUpperCase() + value.slice(1);
    },
  };
}

/**
 * Status badge column configuration
 */
export function createStatusColumn<T>(
  key: string,
  label: string = "Status",
  colorMap?: Record<string, string>
): Column<T> {
  const defaultColorMap: Record<string, string> = {
    pending: "warning",
    completed: "success",
    settled: "success",
    cancelled: "secondary",
    active: "info",
  };

  const colors = colorMap || defaultColorMap;

  return {
    key,
    label,
    sortable: true,
    width: "120px",
    render: (item: any) => {
      const status = item[key];
      const color = colors[status.toLowerCase()] || "secondary";
      return (
        <span className={`badge bg-${color}`}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      );
    },
  };
}

/**
 * Actions column configuration
 */
export function createActionsColumn<T>(actions: TableAction<T>[]): Column<T> {
  return {
    key: "actions",
    label: "Actions",
    sortable: false,
    width: "150px",
    align: "center",
    render: (item: T) => (
      <div className="btn-group btn-group-sm">
        {actions
          .filter((action) => !action.show || action.show(item))
          .map((action, index) => (
            <button
              key={index}
              type="button"
              className={`btn btn-${action.variant || "primary"}`}
              onClick={() => action.onClick(item)}
              disabled={action.loading}
            >
              {action.icon && <i className={`bi ${action.icon} me-1`}></i>}
              {action.label}
            </button>
          ))}
      </div>
    ),
  };
}

/**
 * Description column with truncation
 */
export function createDescriptionColumn<T>(
  key: string,
  label: string = "Description",
  maxLength: number = 50
): Column<T> {
  return {
    key,
    label,
    sortable: false,
    render: (item: any) => {
      const value = item[key] || "-";
      if (value.length <= maxLength) {
        return value;
      }
      return <span title={value}>{value.substring(0, maxLength)}...</span>;
    },
  };
}

// ===========================================================================
// SORTING UTILITIES
// ===========================================================================

/**
 * Sort array of items by field and direction
 */
export function sortItems<T>(items: T[], sortState: SortState): T[] {
  if (!sortState.field) {
    return items;
  }

  return [...items].sort((a, b) => {
    const aValue = (a as any)[sortState.field];
    const bValue = (b as any)[sortState.field];

    // Handle null/undefined
    if (aValue == null && bValue == null) return 0;
    if (aValue == null) return 1;
    if (bValue == null) return -1;

    // Handle dates
    if (aValue instanceof Date && bValue instanceof Date) {
      return sortState.direction === "asc"
        ? aValue.getTime() - bValue.getTime()
        : bValue.getTime() - aValue.getTime();
    }

    // Handle strings (case-insensitive)
    if (typeof aValue === "string" && typeof bValue === "string") {
      return sortState.direction === "asc"
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue);
    }

    // Handle numbers
    if (typeof aValue === "number" && typeof bValue === "number") {
      return sortState.direction === "asc" ? aValue - bValue : bValue - aValue;
    }

    // Fallback to string comparison
    return sortState.direction === "asc"
      ? String(aValue).localeCompare(String(bValue))
      : String(bValue).localeCompare(String(aValue));
  });
}

/**
 * Toggle sort direction for field
 */
export function toggleSort(currentSort: SortState, field: string): SortState {
  if (currentSort.field === field) {
    return {
      field,
      direction: currentSort.direction === "asc" ? "desc" : "asc",
    };
  }
  return {
    field,
    direction: "asc",
  };
}

// ===========================================================================
// FILTERING UTILITIES
// ===========================================================================

/**
 * Filter items by search term across multiple fields
 */
export function filterBySearch<T>(
  items: T[],
  searchTerm: string,
  searchFields: (keyof T)[]
): T[] {
  if (!searchTerm) {
    return items;
  }

  const lowerSearch = searchTerm.toLowerCase();

  return items.filter((item) =>
    searchFields.some((field) => {
      const value = item[field];
      if (value == null) return false;
      return String(value).toLowerCase().includes(lowerSearch);
    })
  );
}

// ===========================================================================
// PAGINATION UTILITIES
// ===========================================================================

/**
 * Paginate items array
 */
export function paginateItems<T>(
  items: T[],
  page: number,
  limit: number
): {
  items: T[];
  pagination: PaginationConfig;
} {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = items.slice(startIndex, endIndex);

  return {
    items: paginatedItems,
    pagination: {
      page,
      limit,
      total: items.length,
      totalPages: Math.ceil(items.length / limit),
    },
  };
}

/**
 * Get pagination info text (e.g., "Showing 1-10 of 50")
 */
export function getPaginationInfo(pagination: PaginationConfig): string {
  const start = (pagination.page - 1) * pagination.limit + 1;
  const end = Math.min(pagination.page * pagination.limit, pagination.total);

  if (pagination.total === 0) {
    return "No items";
  }

  return `Showing ${start}-${end} of ${pagination.total}`;
}

// ===========================================================================
// SELECTION UTILITIES
// ===========================================================================

/**
 * Toggle item selection
 */
export function toggleSelection(selected: string[], itemId: string): string[] {
  if (selected.includes(itemId)) {
    return selected.filter((id) => id !== itemId);
  }
  return [...selected, itemId];
}

/**
 * Toggle all items selection
 */
export function toggleSelectAll(
  items: { _id: string }[],
  selected: string[]
): string[] {
  if (selected.length === items.length) {
    return [];
  }
  return items.map((item) => item._id);
}

/**
 * Check if all items are selected
 */
export function isAllSelected(
  items: { _id: string }[],
  selected: string[]
): boolean {
  return items.length > 0 && items.length === selected.length;
}

// ===========================================================================
// EXPORTS
// ===========================================================================

const tableUtils = {
  createDateColumn,
  createAmountColumn,
  createUserColumn,
  createStatusColumn,
  createActionsColumn,
  createDescriptionColumn,
  sortItems,
  toggleSort,
  filterBySearch,
  paginateItems,
  getPaginationInfo,
  toggleSelection,
  toggleSelectAll,
  isAllSelected,
};

export default tableUtils;
