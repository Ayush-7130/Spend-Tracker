/**
 * Currency and number formatting utilities
 */

/**
 * Format a number as Indian currency (INR)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number): string => {
  return `₹${amount.toLocaleString("en-IN")}`;
};

/**
 * Calculate percentage change between two values
 * @param current - Current value
 * @param previous - Previous value
 * @returns Percentage change (positive for increase, negative for decrease)
 */
export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

/**
 * Calculate percentage of a part relative to the whole
 * @param part - The part value
 * @param whole - The whole value
 * @returns Percentage (0-100)
 */
export const calculatePercentage = (part: number, whole: number): number => {
  if (whole === 0) return 0;
  return (part / whole) * 100;
};

/**
 * Round a number to a specified number of decimal places
 * @param value - The value to round
 * @param decimals - Number of decimal places (default: 2)
 * @returns Rounded number
 */
export const roundToDecimals = (
  value: number,
  decimals: number = 2
): number => {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Format a number with thousand separators (Indian locale)
 * @param value - The number to format
 * @returns Formatted number string
 */
export const formatNumber = (value: number): string => {
  return value.toLocaleString("en-IN");
};
