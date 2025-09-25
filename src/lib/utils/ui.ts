/**
 * UI state and period handling utilities
 */

export type PeriodType = 'week' | 'month' | 'quarter' | 'year' | 'custom';

/**
 * Get display titles for different chart types and periods
 * @param selectedPeriod - Current selected period
 * @returns Object with trend and category chart titles
 */
export const getChartTitles = (selectedPeriod: PeriodType): {
  trendTitle: string;
  categoryTitle: string;
} => {
  const periodNames = {
    week: { 
      trend: 'Daily Spending (Last 7 Days)', 
      category: 'Category-wise Daily Spending' 
    },
    month: { 
      trend: 'Daily Spending (This Month)', 
      category: 'Category-wise Daily Spending' 
    },
    quarter: { 
      trend: 'Monthly Spending (This Quarter)', 
      category: 'Category-wise Monthly Spending' 
    },
    year: { 
      trend: 'Monthly Spending (This Year)', 
      category: 'Category-wise Monthly Spending' 
    },
    custom: { 
      trend: 'Daily Spending (Custom Period)', 
      category: 'Category-wise Daily Spending' 
    }
  };
  
  return {
    trendTitle: periodNames[selectedPeriod].trend,
    categoryTitle: periodNames[selectedPeriod].category
  };
};

/**
 * Get display text for current period
 * @param selectedPeriod - Current selected period
 * @param customStartDate - Custom start date (for custom period)
 * @param customEndDate - Custom end date (for custom period)
 * @returns Period display text
 */
export const getCurrentPeriodText = (
  selectedPeriod: PeriodType,
  customStartDate?: string,
  customEndDate?: string
): string => {
  if (selectedPeriod === 'custom' && customStartDate && customEndDate) {
    const start = new Date(customStartDate).toLocaleDateString('en-IN');
    const end = new Date(customEndDate).toLocaleDateString('en-IN');
    return `${start} to ${end}`;
  }
  
  const periodText: Record<PeriodType, string> = {
    week: 'Last 7 Days',
    month: 'Current Month',
    quarter: 'Current Quarter', 
    year: 'Current Year',
    custom: ''
  };
  
  return periodText[selectedPeriod] || '';
};

/**
 * Validate custom date range
 * @param startDate - Start date string
 * @param endDate - End date string
 * @returns Validation result with error message if invalid
 */
export const validateDateRange = (
  startDate: string, 
  endDate: string
): { isValid: boolean; error?: string } => {
  if (!startDate || !endDate) {
    return { isValid: false, error: 'Both start and end dates are required' };
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { isValid: false, error: 'Invalid date format' };
  }
  
  if (start > end) {
    return { isValid: false, error: 'Start date must be before end date' };
  }
  
  const daysDifference = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (daysDifference > 365) {
    return { isValid: false, error: 'Date range cannot exceed 365 days' };
  }
  
  return { isValid: true };
};

/**
 * Generate period options for dropdowns
 * @returns Array of period option objects
 */
export const getPeriodOptions = (): Array<{
  value: PeriodType;
  label: string;
  description: string;
}> => [
  { value: 'week', label: 'Week', description: 'Last 7 days' },
  { value: 'month', label: 'Month', description: 'Current month' },
  { value: 'quarter', label: 'Quarter', description: 'Current quarter' },
  { value: 'year', label: 'Year', description: 'Current year' },
  { value: 'custom', label: 'Custom', description: 'Select date range' },
];

/**
 * Build API URL with period parameters
 * @param baseUrl - Base API endpoint
 * @param period - Selected period
 * @param customStartDate - Custom start date
 * @param customEndDate - Custom end date
 * @returns Complete URL with query parameters
 */
export const buildPeriodApiUrl = (
  baseUrl: string,
  period: PeriodType,
  customStartDate?: string,
  customEndDate?: string
): string => {
  let url = `${baseUrl}?period=${period}`;
  
  if (period === 'custom' && customStartDate && customEndDate) {
    url += `&startDate=${customStartDate}&endDate=${customEndDate}`;
  }
  
  return url;
};

/**
 * Common loading component configuration
 */
export const getLoadingConfig = () => ({
  className: "d-flex justify-content-center align-items-center",
  style: { minHeight: '400px' },
  spinnerClass: "spinner-border text-primary"
});

/**
 * Common error handling for analytics components
 * @param error - Error message
 * @param onRetry - Retry function
 * @returns Error component props
 */
export const getErrorConfig = (error: string, onRetry?: () => void) => ({
  alertClass: "alert alert-danger",
  icon: "bi bi-exclamation-triangle me-2",
  message: error,
  retryButton: onRetry ? {
    className: "btn btn-outline-danger btn-sm ms-3",
    text: "Retry"
  } : undefined
});