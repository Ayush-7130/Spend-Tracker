/**
 * Analytics calculation utilities
 */

/**
 * Calculate settlement between two parties
 * @param saketTotal - Total paid by Saket
 * @param ayushTotal - Total paid by Ayush
 * @param splitTotal - Total split expenses
 * @returns Settlement calculation result
 */
export const calculateSettlement = (
  saketTotal: number,
  ayushTotal: number,
  splitTotal: number
): {
  settlementRequired: number;
  settlementMessage: string;
} => {
  const saketShare = saketTotal + (splitTotal / 2);
  const ayushShare = ayushTotal + (splitTotal / 2);
  
  const difference = Math.abs(saketShare - ayushShare);
  
  if (difference < 1) {
    return {
      settlementRequired: 0,
      settlementMessage: "No settlement required"
    };
  }
  
  const whoOwes = saketShare > ayushShare ? "Ayush" : "Saket";
  const whoReceives = saketShare > ayushShare ? "Saket" : "Ayush";
  
  return {
    settlementRequired: difference,
    settlementMessage: `${whoOwes} owes ${whoReceives}`
  };
};

/**
 * Calculate category distribution percentages
 * @param categories - Array of category data with amounts
 * @returns Array with calculated percentages
 */
export const calculateCategoryPercentages = <T extends { amount: number }>(
  categories: T[]
): (T & { percentage: number })[] => {
  const total = categories.reduce((sum, cat) => sum + cat.amount, 0);
  
  return categories.map(category => ({
    ...category,
    percentage: total > 0 ? (category.amount / total) * 100 : 0
  }));
};

/**
 * Get change indicator for trend analysis
 * @param change - Percentage change value
 * @returns Object with icon and color class
 */
export const getChangeIndicator = (change: number): {
  icon: string;
  color: string;
  direction: 'up' | 'down' | 'neutral';
} => {
  if (change > 0) {
    return { 
      icon: 'bi-arrow-up', 
      color: 'text-danger',
      direction: 'up'
    };
  }
  if (change < 0) {
    return { 
      icon: 'bi-arrow-down', 
      color: 'text-success',
      direction: 'down'
    };
  }
  return { 
    icon: 'bi-dash', 
    color: 'text-muted',
    direction: 'neutral'
  };
};

/**
 * Calculate daily average from total amount and number of days
 * @param totalAmount - Total amount
 * @param days - Number of days
 * @returns Daily average
 */
export const calculateDailyAverage = (totalAmount: number, days: number): number => {
  if (days <= 0) return 0;
  return totalAmount / days;
};

/**
 * Calculate running totals for timeline data
 * @param amounts - Array of amounts
 * @returns Array of running totals
 */
export const calculateRunningTotals = (amounts: number[]): number[] => {
  const runningTotals: number[] = [];
  let total = 0;
  
  for (const amount of amounts) {
    total += amount;
    runningTotals.push(total);
  }
  
  return runningTotals;
};

/**
 * Group expenses by time period
 * @param expenses - Array of expenses with date strings
 * @param period - Grouping period
 * @returns Grouped data
 */
export const groupExpensesByPeriod = <T extends { date: string; amount: number }>(
  expenses: T[],
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
): Record<string, { total: number; count: number; expenses: T[] }> => {
  const grouped: Record<string, { total: number; count: number; expenses: T[] }> = {};
  
  for (const expense of expenses) {
    const date = new Date(expense.date);
    let key: string;
    
    switch (period) {
      case 'daily':
        key = date.toISOString().split('T')[0]; // YYYY-MM-DD
        break;
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
        break;
      case 'monthly':
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        break;
      case 'yearly':
        key = String(date.getFullYear());
        break;
      default:
        key = date.toISOString().split('T')[0];
    }
    
    if (!grouped[key]) {
      grouped[key] = { total: 0, count: 0, expenses: [] };
    }
    
    grouped[key].total += expense.amount;
    grouped[key].count += 1;
    grouped[key].expenses.push(expense);
  }
  
  return grouped;
};

/**
 * Find top N categories by amount
 * @param categories - Category data with amounts
 * @param limit - Number of top categories to return
 * @returns Top categories sorted by amount
 */
export const getTopCategories = <T extends { amount: number }>(
  categories: T[],
  limit: number = 5
): T[] => {
  return categories
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit);
};

/**
 * Calculate month-over-month growth
 * @param currentMonth - Current month value
 * @param previousMonth - Previous month value
 * @returns Growth object with amount and percentage
 */
export const calculateMonthOverMonthGrowth = (
  currentMonth: number,
  previousMonth: number
): {
  amount: number;
  percentage: number;
} => {
  const amount = currentMonth - previousMonth;
  const percentage = previousMonth === 0 
    ? (currentMonth > 0 ? 100 : 0)
    : (amount / previousMonth) * 100;
  
  return { amount, percentage };
};