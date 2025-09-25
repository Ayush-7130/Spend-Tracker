/**
 * Date formatting and manipulation utilities
 */

/**
 * Format a date string for Indian locale
 * @param dateString - ISO date string or Date object
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export const formatDate = (
  dateString: string | Date,
  options: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }
): string => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
  return date.toLocaleDateString('en-IN', options);
};

/**
 * Format date for short display (DD-MMM format)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date string (e.g., "15-Jan")
 */
export const formatDateShort = (dateString: string | Date): string => {
  return formatDate(dateString, {
    day: '2-digit',
    month: 'short'
  });
};

/**
 * Format date for timeline display
 * @param dateString - ISO date string
 * @returns Formatted date string
 */
export const formatTimelineDate = (dateString: string): string => {
  return formatDate(dateString, {
    day: '2-digit',
    month: 'short'
  });
};

/**
 * Get the current month start and end dates
 * @returns Object with start and end date strings
 */
export const getCurrentMonthRange = (): { start: string; end: string } => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0]
  };
};

/**
 * Get date range for a specified period
 * @param period - Period type
 * @param customStart - Custom start date (for custom period)
 * @param customEnd - Custom end date (for custom period)
 * @returns Object with start and end dates
 */
export const getDateRange = (
  period: 'week' | 'month' | 'quarter' | 'year' | 'custom',
  customStart?: string,
  customEnd?: string
): { start: Date; end: Date } => {
  const now = new Date();
  let start: Date;
  let end: Date = new Date();

  switch (period) {
    case 'week':
      start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      start = new Date(now.getFullYear(), currentQuarter * 3, 1);
      break;
    case 'year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    case 'custom':
      if (customStart && customEnd) {
        start = new Date(customStart);
        end = new Date(customEnd);
      } else {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  return { start, end };
};

/**
 * Check if a date is today
 * @param date - Date to check
 * @returns True if the date is today
 */
export const isToday = (date: Date | string): boolean => {
  const today = new Date();
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  
  return checkDate.getDate() === today.getDate() &&
         checkDate.getMonth() === today.getMonth() &&
         checkDate.getFullYear() === today.getFullYear();
};