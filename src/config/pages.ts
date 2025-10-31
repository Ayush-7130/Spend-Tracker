// Dashboard page configuration
import { TableConfig } from '@/shared/components/Table/config';
import { CardConfig } from '@/shared/components/Card/config';
import { Expense } from '@/datasource/expenses';

// Dashboard layout configuration
export interface DashboardConfig {
  layout: 'grid' | 'flex' | 'masonry';
  sections: DashboardSection[];
  refreshInterval?: number;
  autoRefresh?: boolean;
}

export interface DashboardSection {
  id: string;
  title: string;
  type: 'cards' | 'table' | 'chart' | 'custom';
  gridSpan?: number;
  order: number;
  visible: boolean;
  config: any; // Specific config based on type
}

// Cards configuration for dashboard
export interface DashboardCardsConfig {
  cards: Array<{
    id: string;
    config: CardConfig;
    dataSource: string; // API endpoint or method name
    refreshInterval?: number;
  }>;
}

// Table configuration for expenses
export interface ExpenseTableConfig extends TableConfig<Expense> {
  // Additional expense-specific configurations
  categoryColors?: Record<string, string>;
  userAvatars?: Record<string, string>;
  defaultFilters?: {
    dateRange?: 'today' | 'week' | 'month' | 'year';
    user?: 'all' | 'saket' | 'ayush';
    categories?: string[];
  };
}

// Chart configurations
export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'area' | 'scatter';
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
    }>;
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      tooltip?: {
        enabled?: boolean;
      };
    };
    scales?: {
      x?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
      y?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
    };
  };
  height?: number;
  width?: number;
}

// Filter configurations
export interface FilterConfig {
  id: string;
  type: 'select' | 'multiselect' | 'date' | 'daterange' | 'text' | 'number';
  label: string;
  placeholder?: string;
  options?: Array<{
    label: string;
    value: any;
  }>;
  defaultValue?: any;
  required?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

// Default configurations
export const DefaultConfigs = {
  // Dashboard configuration
  dashboard: (): DashboardConfig => ({
    layout: 'grid',
    sections: [
      {
        id: 'quick-stats',
        title: 'Quick Statistics',
        type: 'cards',
        gridSpan: 4,
        order: 1,
        visible: true,
        config: {
          cards: [
            {
              id: 'total-expenses',
              config: {
                title: 'Total Expenses',
                content: '$0',
                variant: 'filled',
                color: 'primary',
                size: 'small',
                centered: true,
              },
              dataSource: '/api/dashboard?user=all',
              refreshInterval: 30000,
            },
            {
              id: 'monthly-expenses',
              config: {
                title: 'This Month',
                content: '$0',
                variant: 'filled',
                color: 'success',
                size: 'small',
                centered: true,
              },
              dataSource: '/api/dashboard?user=all',
              refreshInterval: 30000,
            },
          ],
        },
      },
      {
        id: 'recent-expenses',
        title: 'Recent Expenses',
        type: 'table',
        gridSpan: 8,
        order: 2,
        visible: true,
        config: {
          columns: [
            { key: 'date', header: 'Date', sortable: true },
            { key: 'description', header: 'Description', sortable: true },
            { key: 'amount', header: 'Amount', sortable: true, align: 'right' },
            { key: 'category', header: 'Category', sortable: true },
            { key: 'paidBy', header: 'Paid By', sortable: true },
          ],
          data: [],
          keyExtractor: (row: Expense) => row._id,
          sortable: true,
          paginated: true,
          pagination: {
            page: 1,
            limit: 5,
            total: 0,
          },
        },
      },
    ],
    refreshInterval: 30000,
    autoRefresh: true,
  }),

  // Expense table configuration
  expenseTable: (): ExpenseTableConfig => ({
    columns: [
      {
        key: 'date',
        header: 'Date',
        accessor: 'date',
        sortable: true,
        render: (value: string) => new Date(value).toLocaleDateString(),
      },
      {
        key: 'description',
        header: 'Description',
        accessor: 'description',
        sortable: true,
      },
      {
        key: 'amount',
        header: 'Amount',
        accessor: 'amount',
        sortable: true,
        align: 'right',
        render: (value: number) => `$${value.toFixed(2)}`,
      },
      {
        key: 'category',
        header: 'Category',
        accessor: 'categoryName',
        sortable: true,
      },
      {
        key: 'paidBy',
        header: 'Paid By',
        accessor: 'paidBy',
        sortable: true,
      },
      {
        key: 'isSplit',
        header: 'Type',
        accessor: 'isSplit',
        render: (value: boolean) => value ? 'Split' : 'Personal',
      },
    ],
    data: [],
    keyExtractor: (row: Expense) => row._id,
    sortable: true,
    filterable: true,
    searchable: true,
    paginated: true,
    selectable: true,
    exportable: true,
    responsive: true,
    filters: [
      {
        key: 'user',
        label: 'User',
        type: 'select',
        options: [
          { label: 'All Users', value: 'all' },
          { label: 'Saket', value: 'saket' },
          { label: 'Ayush', value: 'ayush' },
        ],
        defaultValue: 'all',
      },
      {
        key: 'category',
        label: 'Category',
        type: 'select',
        placeholder: 'All Categories',
        options: [], // Will be populated dynamically
      },
      {
        key: 'dateRange',
        label: 'Date Range',
        type: 'date',
        placeholder: 'Select date range',
      },
    ],
    actions: [
      {
        label: 'Edit',
        icon: 'edit',
        onClick: (row: Expense) => console.log('Edit', row),
        variant: 'primary',
      },
      {
        label: 'Delete',
        icon: 'delete',
        onClick: (row: Expense) => console.log('Delete', row),
        variant: 'danger',
      },
    ],
    bulkActions: [
      {
        label: 'Delete Selected',
        icon: 'delete',
        onClick: (selectedRows: Expense[]) => console.log('Bulk delete', selectedRows),
        variant: 'danger',
        requiresSelection: true,
      },
      {
        label: 'Export Selected',
        icon: 'export',
        onClick: (selectedRows: Expense[]) => console.log('Export', selectedRows),
        variant: 'secondary',
      },
    ],
    pagination: {
      page: 1,
      limit: 10,
      total: 0,
      showSizeSelector: true,
      sizeSelectorOptions: [5, 10, 25, 50],
    },
    selection: {
      enabled: true,
      selectedRows: [],
      onSelectionChange: () => {},
    },
    defaultFilters: {
      dateRange: 'month',
      user: 'all',
    },
  }),

  // Chart configurations
  expenseChart: (type: ChartConfig['type'] = 'line'): ChartConfig => ({
    type,
    data: {
      labels: [],
      datasets: [
        {
          label: 'Expenses',
          data: [],
          backgroundColor: 'rgba(37, 99, 235, 0.1)',
          borderColor: 'rgba(37, 99, 235, 1)',
          borderWidth: 2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          enabled: true,
        },
      },
      scales: {
        x: {
          display: true,
          title: {
            display: true,
            text: 'Date',
          },
        },
        y: {
          display: true,
          title: {
            display: true,
            text: 'Amount ($)',
          },
        },
      },
    },
    height: 300,
  }),

  // Category pie chart
  categoryChart: (): ChartConfig => ({
    type: 'pie',
    data: {
      labels: [],
      datasets: [
        {
          label: 'Expenses by Category',
          data: [],
          backgroundColor: [
            '#2563EB',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#06B6D4',
            '#84CC16',
            '#F97316',
          ],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right',
        },
      },
    },
    height: 300,
  }),
};