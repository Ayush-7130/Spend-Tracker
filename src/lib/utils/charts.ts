/**
 * Chart.js configuration utilities and common options
 */

import { ChartOptions, TooltipItem } from 'chart.js';
import { formatCurrency } from './currency';

/**
 * Standard color palette for charts
 */
export const CHART_COLORS = {
  primary: '#0d6efd',
  success: '#198754', 
  warning: '#ffc107',
  danger: '#dc3545',
  indigo: '#6610f2',
  orange: '#fd7e14',
  teal: '#20c997',
  pink: '#e83e8c'
} as const;

/**
 * Get an array of chart colors
 * @param count - Number of colors needed
 * @returns Array of color strings
 */
export const getChartColors = (count: number = 8): string[] => {
  const colors = Object.values(CHART_COLORS);
  const result: string[] = [];
  
  for (let i = 0; i < count; i++) {
    result.push(colors[i % colors.length]);
  }
  
  return result;
};

/**
 * Common chart options for line charts with currency formatting
 */
export const getLineChartOptions = (hideGrid: boolean = false): ChartOptions<'line'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      callbacks: {
        label: function(context: TooltipItem<'line'>) {
          return `${formatCurrency(context.parsed.y)}`;
        }
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: !hideGrid
      },
      ticks: {
        callback: function(value: string | number) {
          return formatCurrency(Number(value));
        }
      }
    },
    x: {
      grid: {
        display: !hideGrid
      }
    }
  },
});

/**
 * Common chart options for bar charts with currency formatting
 */
export const getBarChartOptions = (stacked: boolean = false): ChartOptions<'bar'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
    },
    tooltip: {
      callbacks: {
        label: function(context: TooltipItem<'bar'>) {
          const label = context.dataset.label || '';
          return `${label}: ${formatCurrency(context.parsed.y)}`;
        }
      }
    }
  },
  scales: {
    x: {
      stacked: stacked,
    },
    y: {
      stacked: stacked,
      beginAtZero: true,
      ticks: {
        callback: function(value: string | number) {
          return formatCurrency(Number(value));
        }
      }
    },
  },
});

/**
 * Common chart options for pie/doughnut charts with currency formatting
 */
export const getPieChartOptions = (showPercentage: boolean = true): ChartOptions<'pie'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: function(context: TooltipItem<'pie'>) {
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          
          if (showPercentage) {
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
          return `${context.label}: ${formatCurrency(value)}`;
        }
      }
    }
  },
});

/**
 * Common chart options for doughnut charts with currency formatting
 */
export const getDoughnutChartOptions = (showPercentage: boolean = true): ChartOptions<'doughnut'> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
      },
    },
    tooltip: {
      callbacks: {
        label: function(context: TooltipItem<'doughnut'>) {
          const value = context.parsed;
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
          const percentage = ((value / total) * 100).toFixed(1);
          
          if (showPercentage) {
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
          return `${context.label}: ${formatCurrency(value)}`;
        }
      }
    }
  },
});

/**
 * Create line chart dataset configuration
 * @param label - Dataset label
 * @param data - Data points
 * @param color - Primary color
 * @param filled - Whether to fill area under line
 * @param highlightToday - Whether to highlight today's point
 * @param todayIndex - Index of today's data point
 */
export const createLineDataset = (
  label: string,
  data: number[],
  color: string = CHART_COLORS.primary,
  filled: boolean = true,
  highlightToday: boolean = false,
  todayIndex: number = -1
) => {
  const pointColors = data.map((_, index) => 
    highlightToday && index === todayIndex ? CHART_COLORS.danger : color
  );
  
  const pointRadii = data.map((_, index) => 
    highlightToday && index === todayIndex ? 6 : 3
  );
  
  return {
    label,
    data,
    borderColor: color,
    backgroundColor: filled ? `${color}1A` : color, // 1A = 10% opacity
    fill: filled,
    tension: 0.4,
    pointBackgroundColor: pointColors,
    pointBorderColor: pointColors,
    pointRadius: pointRadii,
    pointHoverRadius: data.map((_, index) => 
      highlightToday && index === todayIndex ? 8 : 5
    ),
  };
};

/**
 * Create bar chart dataset configuration
 * @param label - Dataset label
 * @param data - Data points
 * @param color - Bar color
 */
export const createBarDataset = (
  label: string,
  data: number[],
  color: string = CHART_COLORS.primary
) => ({
  label,
  data,
  backgroundColor: color,
  borderColor: color,
  borderWidth: 1,
});

/**
 * Get user-specific color
 * @param userName - User name
 * @returns Color string
 */
export const getUserColor = (userName: string): string => {
  const userColors: Record<string, string> = {
    saket: CHART_COLORS.primary,
    ayush: CHART_COLORS.success,
  };
  
  return userColors[userName.toLowerCase()] || CHART_COLORS.primary;
};