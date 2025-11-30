/**
 * Chart.js configuration utilities and common options
 */

import { ChartOptions, TooltipItem } from "chart.js";
import { formatCurrency } from "./currency";
import {
  chartPalettes,
  bootstrapColors,
  getUserColor as getSemanticUserColor,
} from "@/styles/colors";

/**
 * Standard color palette for charts
 * Now using centralized color system from @/styles/colors
 */
export const CHART_COLORS = {
  primary: bootstrapColors.light.primary,
  success: bootstrapColors.light.success,
  warning: bootstrapColors.light.warning,
  danger: bootstrapColors.light.danger,
  indigo: "#8B5CF6", // Violet
  orange: "#F97316", // Orange
  teal: "#06B6D4", // Cyan
  pink: "#EC4899", // Pink
} as const;

/**
 * Get an array of chart colors
 * @param count - Number of colors needed
 * @param theme - Theme to use ('light' | 'dark')
 * @returns Array of color strings
 */
export const getChartColors = (
  count: number = 8,
  theme: "light" | "dark" = "light"
): string[] => {
  const palette =
    theme === "light" ? chartPalettes.primary : chartPalettes.professional;
  const result: string[] = [];

  for (let i = 0; i < count; i++) {
    result.push(palette[i % palette.length]);
  }

  return result;
};

/**
 * Common chart options for line charts with currency formatting
 */
export const getLineChartOptions = (
  hideGrid: boolean = false,
  theme: "light" | "dark" = "light"
): ChartOptions<"line"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
      labels: {
        color: theme === "light" ? "#2D1B69" : "#E2E8F0",
      },
    },
    tooltip: {
      backgroundColor:
        theme === "light"
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(30, 41, 59, 0.95)",
      titleColor: theme === "light" ? "#2D1B69" : "#E2E8F0",
      bodyColor: theme === "light" ? "#4C3D8B" : "#CBD5E1",
      borderColor: theme === "light" ? "#E5D9F2" : "#374151",
      borderWidth: 1,
      callbacks: {
        label: function (context: TooltipItem<"line">) {
          const value = context.parsed.y ?? 0;
          return `${formatCurrency(value)}`;
        },
      },
    },
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        display: !hideGrid,
        color: theme === "light" ? "#E5D9F2" : "#374151",
      },
      ticks: {
        color: theme === "light" ? "#6B5B95" : "#94A3B8",
        callback: function (value: string | number) {
          return formatCurrency(Number(value));
        },
      },
    },
    x: {
      grid: {
        display: !hideGrid,
        color: theme === "light" ? "#E5D9F2" : "#374151",
      },
      ticks: {
        color: theme === "light" ? "#6B5B95" : "#94A3B8",
      },
    },
  },
});

/**
 * Common chart options for bar charts with currency formatting
 */
export const getBarChartOptions = (
  stacked: boolean = false,
  theme: "light" | "dark" = "light"
): ChartOptions<"bar"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        color: theme === "light" ? "#2D1B69" : "#E2E8F0",
        padding: 15,
        usePointStyle: true,
      },
    },
    tooltip: {
      backgroundColor:
        theme === "light"
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(30, 41, 59, 0.95)",
      titleColor: theme === "light" ? "#2D1B69" : "#E2E8F0",
      bodyColor: theme === "light" ? "#4C3D8B" : "#CBD5E1",
      borderColor: theme === "light" ? "#E5D9F2" : "#374151",
      borderWidth: 1,
      callbacks: {
        label: function (context: TooltipItem<"bar">) {
          const label = context.dataset.label || "";
          const value = context.parsed.y ?? 0;
          return `${label}: ${formatCurrency(value)}`;
        },
      },
    },
  },
  scales: {
    x: {
      stacked: stacked,
      grid: {
        color: theme === "light" ? "#E5D9F2" : "#374151",
      },
      ticks: {
        color: theme === "light" ? "#6B5B95" : "#94A3B8",
      },
    },
    y: {
      stacked: stacked,
      beginAtZero: true,
      grid: {
        color: theme === "light" ? "#E5D9F2" : "#374151",
      },
      ticks: {
        color: theme === "light" ? "#6B5B95" : "#94A3B8",
        callback: function (value: string | number) {
          return formatCurrency(Number(value));
        },
      },
    },
  },
});

/**
 * Common chart options for pie/doughnut charts with currency formatting
 */
export const getPieChartOptions = (
  showPercentage: boolean = true,
  theme: "light" | "dark" = "light"
): ChartOptions<"pie"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        color: theme === "light" ? "#2D1B69" : "#E2E8F0",
      },
    },
    tooltip: {
      backgroundColor:
        theme === "light"
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(30, 41, 59, 0.95)",
      titleColor: theme === "light" ? "#2D1B69" : "#E2E8F0",
      bodyColor: theme === "light" ? "#4C3D8B" : "#CBD5E1",
      borderColor: theme === "light" ? "#E5D9F2" : "#374151",
      borderWidth: 1,
      callbacks: {
        label: function (context: TooltipItem<"pie">) {
          const value = context.parsed ?? 0;
          const dataArray = context.dataset.data as number[];
          const total = dataArray.reduce(
            (a: number, b: number) => a + (b ?? 0),
            0
          );
          const percentage =
            total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

          if (showPercentage) {
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
          return `${context.label}: ${formatCurrency(value)}`;
        },
      },
    },
  },
});

/**
 * Common chart options for doughnut charts with currency formatting
 */
export const getDoughnutChartOptions = (
  showPercentage: boolean = true,
  theme: "light" | "dark" = "light"
): ChartOptions<"doughnut"> => ({
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: "bottom" as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        color: theme === "light" ? "#2D1B69" : "#E2E8F0",
      },
    },
    tooltip: {
      backgroundColor:
        theme === "light"
          ? "rgba(255, 255, 255, 0.95)"
          : "rgba(30, 41, 59, 0.95)",
      titleColor: theme === "light" ? "#2D1B69" : "#E2E8F0",
      bodyColor: theme === "light" ? "#4C3D8B" : "#CBD5E1",
      borderColor: theme === "light" ? "#E5D9F2" : "#374151",
      borderWidth: 1,
      callbacks: {
        label: function (context: TooltipItem<"doughnut">) {
          const value = context.parsed ?? 0;
          const dataArray = context.dataset.data as number[];
          const total = dataArray.reduce(
            (a: number, b: number) => a + (b ?? 0),
            0
          );
          const percentage =
            total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";

          if (showPercentage) {
            return `${context.label}: ${formatCurrency(value)} (${percentage}%)`;
          }
          return `${context.label}: ${formatCurrency(value)}`;
        },
      },
    },
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
 * @param theme - Theme to use ('light' | 'dark')
 * @returns Color string
 */
export const getUserColor = (
  userName: string,
  theme: "light" | "dark" = "light"
): string => {
  const lowerName = userName.toLowerCase();
  if (lowerName === "saket" || lowerName === "ayush") {
    return getSemanticUserColor(lowerName as "saket" | "ayush", theme);
  }

  return CHART_COLORS.primary;
};
