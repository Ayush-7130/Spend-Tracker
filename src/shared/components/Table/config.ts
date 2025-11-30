import { ReactNode } from "react";

// Table configuration types
export interface TableColumn<T = any> {
  key: string;
  header: string;
  accessor?: keyof T | string;
  render?: (value: any, row: T, index: number) => ReactNode;
  sortable?: boolean;
  width?: string | number;
  align?: "left" | "center" | "right";
  className?: string;
  headerClassName?: string;
  sticky?: boolean;
}

export interface TableAction<T = any> {
  label: string;
  icon?: string;
  onClick: (row: T, index: number) => void;
  variant?: "primary" | "secondary" | "danger" | "warning" | "success";
  disabled?: (row: T) => boolean;
  hidden?: (row: T) => boolean;
  className?: string;
}

export interface TableFilter {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "number" | "range";
  options?: Array<{ label: string; value: any }>;
  placeholder?: string;
  defaultValue?: any;
}

export interface TablePagination {
  page: number;
  limit: number;
  total: number;
  showSizeSelector?: boolean;
  sizeSelectorOptions?: number[];
}

export interface TableSort {
  column: string;
  direction: "asc" | "desc";
}

export interface TableSelection<T = any> {
  enabled: boolean;
  selectedRows: T[];
  onSelectionChange: (selectedRows: T[]) => void;
  selectAll?: boolean;
  getRowId?: (row: T) => string | number;
}

export interface TableConfig<T = any> {
  // Data and columns
  columns: TableColumn<T>[];
  data: T[];
  keyExtractor: (row: T) => string | number;

  // Table behavior
  sortable?: boolean;
  filterable?: boolean;
  selectable?: boolean;
  paginated?: boolean;
  searchable?: boolean;

  // Sorting
  defaultSort?: TableSort;
  onSort?: (sort: TableSort) => void;

  // Filtering
  filters?: TableFilter[];
  onFilter?: (filters: Record<string, any>) => void;

  // Pagination
  pagination?: TablePagination;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;

  // Selection
  selection?: TableSelection<T>;

  // Actions
  actions?: TableAction<T>[];
  bulkActions?: Array<{
    label: string;
    icon?: string;
    onClick: (selectedRows: T[]) => void;
    variant?: "primary" | "secondary" | "danger" | "warning" | "success";
    requiresSelection?: boolean;
  }>;

  // Search
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;

  // Styling
  className?: string;
  headerClassName?: string;
  rowClassName?: string | ((row: T, index: number) => string);
  size?: "small" | "medium" | "large";
  striped?: boolean;
  bordered?: boolean;
  hover?: boolean;

  // Loading and empty states
  loading?: boolean;
  loadingText?: string;
  emptyTitle?: string;
  emptyText?: string;
  emptyIcon?: string;

  // Export functionality
  exportable?: boolean;
  exportFormats?: Array<"csv" | "json" | "excel">;
  onExport?: (format: "csv" | "json" | "excel", data: T[]) => void;

  // Responsive behavior
  responsive?: boolean;
  breakpoint?: "sm" | "md" | "lg" | "xl";
  mobileLayout?: "stack" | "scroll" | "cards";

  // Virtual scrolling for large datasets
  virtual?: boolean;
  itemHeight?: number;

  // Tree/hierarchical data
  expandable?: boolean;
  getChildRows?: (row: T) => T[];
  expandedRows?: Set<string | number>;
  onRowExpand?: (rowId: string | number, expanded: boolean) => void;

  // Drag and drop
  draggable?: boolean;
  onRowReorder?: (fromIndex: number, toIndex: number) => void;

  // Custom cell editors for inline editing
  editable?: boolean;
  editableColumns?: string[];
  onCellEdit?: (rowId: string | number, column: string, value: any) => void;
}

// Predefined table configurations for common use cases
export const DefaultTableConfigs = {
  // Basic data table
  basic: <T>(
    columns: TableColumn<T>[],
    data: T[],
    keyExtractor: (row: T) => string | number
  ): TableConfig<T> => ({
    columns,
    data,
    keyExtractor,
    sortable: true,
    filterable: false,
    searchable: true,
    hover: true,
    striped: true,
    size: "medium",
  }),

  // Advanced table with all features
  advanced: <T>(
    columns: TableColumn<T>[],
    data: T[],
    keyExtractor: (row: T) => string | number
  ): TableConfig<T> => ({
    columns,
    data,
    keyExtractor,
    sortable: true,
    filterable: true,
    searchable: true,
    paginated: true,
    selectable: true,
    exportable: true,
    hover: true,
    striped: true,
    responsive: true,
    size: "medium",
    pagination: {
      page: 1,
      limit: 10,
      total: data.length,
      showSizeSelector: true,
      sizeSelectorOptions: [5, 10, 25, 50, 100],
    },
    selection: {
      enabled: true,
      selectedRows: [],
      onSelectionChange: () => {},
    },
    exportFormats: ["csv", "json"],
  }),

  // Mobile-friendly table
  mobile: <T>(
    columns: TableColumn<T>[],
    data: T[],
    keyExtractor: (row: T) => string | number
  ): TableConfig<T> => ({
    columns,
    data,
    keyExtractor,
    responsive: true,
    mobileLayout: "cards",
    searchable: true,
    paginated: true,
    size: "small",
    pagination: {
      page: 1,
      limit: 5,
      total: data.length,
    },
  }),

  // Data grid for editing
  editable: <T>(
    columns: TableColumn<T>[],
    data: T[],
    keyExtractor: (row: T) => string | number
  ): TableConfig<T> => ({
    columns,
    data,
    keyExtractor,
    editable: true,
    sortable: true,
    filterable: true,
    bordered: true,
    size: "medium",
  }),
};
