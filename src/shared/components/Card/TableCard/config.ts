/**
 * TableCard Configuration
 * 
 * Defines configuration for table-to-card responsive transformations.
 * Used to map table columns to card layouts on mobile devices.
 */

export interface TableCardColumnConfig<TData = any> {
  /**
   * Unique identifier for the column
   */
  key: string;
  
  /**
   * Column label (used in card view)
   */
  label?: string;
  
  /**
   * Render function for the column value
   */
  render?: (item: TData) => React.ReactNode;
  
  /**
   * Whether this is the primary field (shown as card title)
   */
  isPrimary?: boolean;
  
  /**
   * Whether this is a secondary field (shown as subtitle)
   */
  isSecondary?: boolean;
  
  /**
   * Whether this field should be hidden in card view
   */
  hideInCard?: boolean;
  
  /**
   * Custom CSS class for the card field
   */
  className?: string;
  
  /**
   * Icon to display before the field (e.g., 'bi-calendar')
   */
  icon?: string;
  
  /**
   * Position of the field in the card
   * - header: Top section (primary/secondary)
   * - body: Main content area
   * - footer: Bottom section (typically for actions)
   */
  position?: 'header' | 'body' | 'footer';
  
  /**
   * Order within the position section (lower numbers appear first)
   */
  order?: number;
  
  /**
   * Whether the field should take full width in card view
   */
  fullWidth?: boolean;
  
  /**
   * Custom formatter function
   */
  format?: (value: any) => string;
}

export interface TableCardConfig<TData = any> {
  /**
   * Column configurations
   */
  columns: TableCardColumnConfig<TData>[];
  
  /**
   * Breakpoint for switching to card view (in pixels)
   * Default: 768 (tablet and below)
   */
  cardBreakpoint?: number;
  
  /**
   * Whether to enable card view
   */
  enableCardView?: boolean;
  
  /**
   * Custom card component class
   */
  cardClassName?: string;
  
  /**
   * Custom card header class
   */
  cardHeaderClassName?: string;
  
  /**
   * Custom card body class
   */
  cardBodyClassName?: string;
  
  /**
   * Custom card footer class
   */
  cardFooterClassName?: string;
  
  /**
   * Whether to show dividers between fields in card view
   */
  showDividers?: boolean;
  
  /**
   * Whether to show labels in card view
   */
  showLabels?: boolean;
  
  /**
   * Gap between fields in card view (in rem)
   */
  fieldGap?: number;
  
  /**
   * Whether to use compact mode (less padding)
   */
  compact?: boolean;
}

/**
 * Default configuration values
 */
export const defaultTableCardConfig: Partial<TableCardConfig> = {
  cardBreakpoint: 768,
  enableCardView: true,
  showDividers: false,
  showLabels: true,
  fieldGap: 0.75,
  compact: false,
};

/**
 * Helper function to create a column configuration
 */
export function createTableCardColumn<TData = any>(
  config: TableCardColumnConfig<TData>
): TableCardColumnConfig<TData> {
  return {
    position: 'body',
    order: 0,
    hideInCard: false,
    fullWidth: false,
    ...config,
  };
}

/**
 * Helper function to create a complete table card configuration
 */
export function createTableCardConfig<TData = any>(
  config: TableCardConfig<TData>
): TableCardConfig<TData> {
  return {
    ...defaultTableCardConfig,
    ...config,
  };
}
