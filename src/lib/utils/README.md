# Utility Functions - Spend Tracker Analytics

This directory contains reusable utility functions that follow the DRY (Don't Repeat Yourself) principle for the Spend Tracker application's analytics features.

## Structure

```
src/lib/utils/
├── index.ts          # Main exports file
├── analytics.ts      # Analytics calculations and data processing
├── charts.ts         # Chart.js configurations and chart-related utilities
├── currency.ts       # Currency formatting and number utilities
├── date.ts          # Date formatting and manipulation
└── ui.ts            # UI state management and period handling
```

## Usage

Import utilities from the main index file:

```typescript
import { 
  formatCurrency, 
  formatDate, 
  getLineChartOptions, 
  calculateSettlement 
} from '@/lib/utils';
```

Or import from specific modules:

```typescript
import { formatCurrency } from '@/lib/utils/currency';
import { getLineChartOptions } from '@/lib/utils/charts';
```

## Modules

### Currency (`currency.ts`)

Handles all currency formatting and number calculations:

- `formatCurrency(amount: number)` - Format numbers as Indian currency (₹)
- `calculatePercentageChange(current, previous)` - Calculate percentage change between values
- `calculatePercentage(part, whole)` - Calculate percentage of part relative to whole
- `roundToDecimals(value, decimals)` - Round numbers to specified decimal places
- `formatNumber(value)` - Format numbers with thousand separators

### Date (`date.ts`)

Date formatting and manipulation utilities:

- `formatDate(dateString, options)` - Format dates for Indian locale
- `formatDateShort(dateString)` - Short date format (DD-MMM)
- `formatTimelineDate(dateString)` - Format dates for timeline displays
- `getCurrentMonthRange()` - Get current month start/end dates
- `getDateRange(period, customStart, customEnd)` - Get date ranges for different periods
- `isToday(date)` - Check if a date is today

### Charts (`charts.ts`)

Chart.js configurations and styling utilities:

- `CHART_COLORS` - Standard color palette for charts
- `getChartColors(count)` - Get array of chart colors
- `getLineChartOptions()` - Line chart configuration with currency formatting
- `getBarChartOptions(stacked)` - Bar chart configuration
- `getPieChartOptions()` - Pie chart configuration
- `getDoughnutChartOptions()` - Doughnut chart configuration
- `createLineDataset()` - Create line chart dataset
- `createBarDataset()` - Create bar chart dataset
- `getUserColor(userName)` - Get user-specific colors

### Analytics (`analytics.ts`)

Business logic and calculation utilities:

- `calculateSettlement(saketTotal, ayushTotal, splitTotal)` - Calculate settlement between users
- `calculateCategoryPercentages(categories)` - Add percentage calculations to category data
- `getChangeIndicator(change)` - Get trend indicators (up/down/neutral)
- `calculateDailyAverage(totalAmount, days)` - Calculate daily spending averages
- `calculateRunningTotals(amounts)` - Calculate running totals for timeline
- `groupExpensesByPeriod(expenses, period)` - Group expenses by time periods
- `getTopCategories(categories, limit)` - Get top N categories by amount
- `calculateMonthOverMonthGrowth(current, previous)` - Calculate MoM growth

### UI (`ui.ts`)

UI state management and display utilities:

- `PeriodType` - Type definition for time periods
- `getChartTitles(selectedPeriod)` - Get chart titles based on period
- `getCurrentPeriodText(period, customStart, customEnd)` - Get period display text
- `validateDateRange(startDate, endDate)` - Validate custom date ranges
- `getPeriodOptions()` - Get period dropdown options
- `buildPeriodApiUrl(baseUrl, period, dates)` - Build API URLs with period parameters
- `getLoadingConfig()` - Common loading component configuration
- `getErrorConfig(error, onRetry)` - Common error handling configuration

## Benefits

### Before Refactoring
- Duplicated `formatCurrency` function across 3+ components
- Repeated chart configuration objects
- Inline calculation logic mixed with UI components
- Inconsistent date formatting implementations
- Hard-coded color arrays in multiple files

### After Refactoring
- ✅ Single source of truth for all utility functions
- ✅ Consistent formatting across all analytics components
- ✅ Reusable chart configurations
- ✅ Centralized business logic calculations
- ✅ Type-safe utility functions with proper TypeScript typing
- ✅ Easy maintenance and testing
- ✅ Better code organization following Next.js best practices

## Example Usage in Components

### Before:
```typescript
// Duplicated in every component
const formatCurrency = (amount: number) => {
  return `₹${amount.toLocaleString('en-IN')}`;
};

// Repeated chart options
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    tooltip: {
      callbacks: {
        label: function(context) {
          return `${formatCurrency(context.parsed.y)}`;
        }
      }
    }
  },
  // ... many more lines
};
```

### After:
```typescript
import { formatCurrency, getLineChartOptions } from '@/lib/utils';

// Clean, reusable functions
const chartOptions = getLineChartOptions();
```

## Testing

All utility functions are pure functions that can be easily unit tested:

```typescript
import { formatCurrency, calculatePercentageChange } from '@/lib/utils';

describe('Currency Utils', () => {
  it('should format currency correctly', () => {
    expect(formatCurrency(1000)).toBe('₹1,000');
  });
});
```

## Future Enhancements

- Add unit tests for all utility functions
- Add JSDoc documentation with examples
- Create storybook stories for chart components
- Add locale-specific formatting options
- Add caching for expensive calculations