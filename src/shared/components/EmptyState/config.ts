// EmptyState configuration types
export interface EmptyStateConfig {
  icon?: string;
  title?: string;
  description?: string;
  actions?: Array<{
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'outline';
    icon?: string;
  }>;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'error' | 'search' | 'filter';
  className?: string;
  centered?: boolean;
  showBorder?: boolean;
}

// Default configurations
export const DefaultEmptyStateConfigs = {
  // Generic empty state
  default: (title?: string, description?: string): EmptyStateConfig => ({
    icon: '📋',
    title: title || 'No data available',
    description: description || 'There is no data to display at this time.',
    size: 'medium',
    variant: 'default',
    centered: true,
  }),

  // Search results empty state
  search: (query?: string): EmptyStateConfig => ({
    icon: '🔍',
    title: 'No results found',
    description: query ? `No results found for "${query}"` : 'Try adjusting your search terms.',
    size: 'medium',
    variant: 'search',
    centered: true,
    actions: [
      {
        label: 'Clear Search',
        onClick: () => {},
        variant: 'outline',
      },
    ],
  }),

  // Filter results empty state
  filter: (): EmptyStateConfig => ({
    icon: '🔧',
    title: 'No matching results',
    description: 'No data matches your current filters. Try adjusting the filter criteria.',
    size: 'medium',
    variant: 'filter',
    centered: true,
    actions: [
      {
        label: 'Clear Filters',
        onClick: () => {},
        variant: 'outline',
      },
    ],
  }),

  // Error state
  error: (title?: string, description?: string): EmptyStateConfig => ({
    icon: '⚠️',
    title: title || 'Something went wrong',
    description: description || 'We encountered an error loading the data.',
    size: 'medium',
    variant: 'error',
    centered: true,
    actions: [
      {
        label: 'Try Again',
        onClick: () => {},
        variant: 'primary',
      },
    ],
  }),

  // Table empty state
  table: (entityName?: string): EmptyStateConfig => ({
    icon: '📊',
    title: `No ${entityName || 'items'} found`,
    description: `You haven't created any ${entityName || 'items'} yet.`,
    size: 'small',
    variant: 'default',
    centered: true,
    showBorder: false,
    actions: [
      {
        label: `Add ${entityName || 'Item'}`,
        onClick: () => {},
        variant: 'primary',
        icon: 'plus',
      },
    ],
  }),

  // Dashboard widget empty state
  widget: (widgetName?: string): EmptyStateConfig => ({
    icon: '📈',
    title: 'No data available',
    description: `${widgetName || 'This widget'} will display data once it's available.`,
    size: 'small',
    variant: 'default',
    centered: true,
    showBorder: false,
  }),
};