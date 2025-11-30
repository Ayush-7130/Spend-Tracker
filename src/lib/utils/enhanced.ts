/**
 * Enhanced utility functions for the spend tracker application
 * This file replaces and extends the existing utils with better organization
 */

// Date utility functions
export const dateUtils = {
  /**
   * Format date to different formats
   */
  format: (
    date: Date | string,
    format: "short" | "long" | "time" | "iso" = "short"
  ): string => {
    const d = typeof date === "string" ? new Date(date) : date;

    switch (format) {
      case "short":
        return d.toLocaleDateString("en-US", {
          month: "2-digit",
          day: "2-digit",
          year: "numeric",
        });
      case "long":
        return d.toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        });
      case "time":
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });
      case "iso":
        return d.toISOString().split("T")[0];
      default:
        return d.toLocaleDateString();
    }
  },

  /**
   * Get relative time (e.g., "2 days ago", "in 3 hours")
   */
  relative: (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return diffDays === 1 ? "1 day ago" : `${diffDays} days ago`;
    } else if (diffDays < 0) {
      const futureDays = Math.abs(diffDays);
      return futureDays === 1 ? "in 1 day" : `in ${futureDays} days`;
    } else if (diffHours > 0) {
      return diffHours === 1 ? "1 hour ago" : `${diffHours} hours ago`;
    } else if (diffHours < 0) {
      const futureHours = Math.abs(diffHours);
      return futureHours === 1 ? "in 1 hour" : `in ${futureHours} hours`;
    } else if (diffMinutes > 0) {
      return diffMinutes === 1 ? "1 minute ago" : `${diffMinutes} minutes ago`;
    } else {
      return "just now";
    }
  },

  /**
   * Get date ranges
   */
  getRange: (
    period: "today" | "week" | "month" | "year" | "custom",
    customStart?: Date,
    customEnd?: Date
  ) => {
    const now = new Date();
    let start: Date, end: Date;

    switch (period) {
      case "today":
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59
        );
        break;
      case "week":
        const startOfWeek = now.getDate() - now.getDay();
        start = new Date(now.getFullYear(), now.getMonth(), startOfWeek);
        end = new Date(
          now.getFullYear(),
          now.getMonth(),
          startOfWeek + 6,
          23,
          59,
          59
        );
        break;
      case "month":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        break;
      case "year":
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
        break;
      case "custom":
        start = customStart || now;
        end = customEnd || now;
        break;
      default:
        start = end = now;
    }

    return { start, end };
  },

  /**
   * Check if date is within range
   */
  isInRange: (date: Date | string, start: Date, end: Date): boolean => {
    const d = typeof date === "string" ? new Date(date) : date;
    return d >= start && d <= end;
  },

  /**
   * Get months between two dates
   */
  getMonthsBetween: (start: Date, end: Date): string[] => {
    const months: string[] = [];
    const current = new Date(start);

    while (current <= end) {
      months.push(
        current.toLocaleDateString("en-US", { year: "numeric", month: "long" })
      );
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  },
};

// Currency and number formatting utilities
export const currencyUtils = {
  /**
   * Format currency with proper symbols and decimals
   */
  format: (
    amount: number,
    currency: "USD" | "EUR" | "GBP" = "USD",
    locale: string = "en-US"
  ): string => {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  },

  /**
   * Parse currency string to number
   */
  parse: (value: string): number => {
    return parseFloat(value.replace(/[^0-9.-]+/g, "")) || 0;
  },

  /**
   * Format number with thousands separator
   */
  formatNumber: (value: number, decimals: number = 0): string => {
    return new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },

  /**
   * Calculate percentage
   */
  percentage: (value: number, total: number, decimals: number = 1): string => {
    if (total === 0) return "0%";
    const percent = (value / total) * 100;
    return `${percent.toFixed(decimals)}%`;
  },

  /**
   * Calculate change between two values
   */
  calculateChange: (
    current: number,
    previous: number
  ): {
    value: number;
    percentage: number;
    trend: "increase" | "decrease" | "stable";
  } => {
    const change = current - previous;
    const percentage = previous === 0 ? 0 : (change / previous) * 100;

    let trend: "increase" | "decrease" | "stable";
    if (change > 0) trend = "increase";
    else if (change < 0) trend = "decrease";
    else trend = "stable";

    return { value: change, percentage, trend };
  },
};

// Validation utilities
export const validationUtils = {
  /**
   * Validate email format
   */
  email: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Validate required field
   */
  required: (value: any): boolean => {
    return value !== null && value !== undefined && value !== "";
  },

  /**
   * Validate number range
   */
  numberRange: (value: number, min?: number, max?: number): boolean => {
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  },

  /**
   * Validate string length
   */
  stringLength: (value: string, min?: number, max?: number): boolean => {
    if (min !== undefined && value.length < min) return false;
    if (max !== undefined && value.length > max) return false;
    return true;
  },

  /**
   * Validate expense amount
   */
  expenseAmount: (amount: number): { valid: boolean; message?: string } => {
    if (!validationUtils.required(amount)) {
      return { valid: false, message: "Amount is required" };
    }
    if (isNaN(amount) || amount <= 0) {
      return { valid: false, message: "Amount must be a positive number" };
    }
    if (amount > 10000) {
      return { valid: false, message: "Amount cannot exceed $10,000" };
    }
    return { valid: true };
  },

  /**
   * Validate date
   */
  date: (date: string | Date): { valid: boolean; message?: string } => {
    const d = typeof date === "string" ? new Date(date) : date;
    if (isNaN(d.getTime())) {
      return { valid: false, message: "Invalid date" };
    }
    const now = new Date();
    if (d > now) {
      return { valid: false, message: "Date cannot be in the future" };
    }
    return { valid: true };
  },
};

// Data processing utilities
export const dataUtils = {
  /**
   * Group array by a property
   */
  groupBy: <T>(array: T[], key: keyof T): Record<string, T[]> => {
    return array.reduce(
      (groups, item) => {
        const groupKey = String(item[key]);
        groups[groupKey] = groups[groupKey] || [];
        groups[groupKey].push(item);
        return groups;
      },
      {} as Record<string, T[]>
    );
  },

  /**
   * Sort array by multiple criteria
   */
  sortBy: <T>(
    array: T[],
    ...criteria: Array<{ key: keyof T; direction: "asc" | "desc" }>
  ): T[] => {
    return array.sort((a, b) => {
      for (const { key, direction } of criteria) {
        const aVal = a[key];
        const bVal = b[key];

        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  },

  /**
   * Filter array with multiple conditions
   */
  filter: <T>(array: T[], conditions: Record<string, any>): T[] => {
    return array.filter((item) => {
      return Object.entries(conditions).every(([key, value]) => {
        if (value === null || value === undefined || value === "") return true;
        const itemValue = (item as any)[key];

        if (Array.isArray(value)) {
          return value.includes(itemValue);
        }

        if (typeof value === "string" && typeof itemValue === "string") {
          return itemValue.toLowerCase().includes(value.toLowerCase());
        }

        return itemValue === value;
      });
    });
  },

  /**
   * Calculate statistics for numeric array
   */
  statistics: (
    numbers: number[]
  ): {
    sum: number;
    average: number;
    median: number;
    min: number;
    max: number;
    count: number;
  } => {
    if (numbers.length === 0) {
      return { sum: 0, average: 0, median: 0, min: 0, max: 0, count: 0 };
    }

    const sorted = [...numbers].sort((a, b) => a - b);
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const average = sum / numbers.length;
    const median =
      sorted.length % 2 === 0
        ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
        : sorted[Math.floor(sorted.length / 2)];

    return {
      sum,
      average,
      median,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      count: numbers.length,
    };
  },

  /**
   * Paginate array
   */
  paginate: <T>(
    array: T[],
    page: number,
    limit: number
  ): {
    data: T[];
    totalPages: number;
    currentPage: number;
    totalItems: number;
  } => {
    const totalItems = array.length;
    const totalPages = Math.ceil(totalItems / limit);
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const data = array.slice(startIndex, endIndex);

    return {
      data,
      totalPages,
      currentPage: page,
      totalItems,
    };
  },

  /**
   * Debounce function calls
   */
  debounce: <T extends (...args: any[]) => any>(func: T, delay: number): T => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return ((...args: any[]) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    }) as T;
  },

  /**
   * Deep clone object
   */
  deepClone: <T>(obj: T): T => {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj.getTime()) as any;
    if (obj instanceof Array)
      return obj.map((item) => dataUtils.deepClone(item)) as any;
    if (typeof obj === "object") {
      const cloned = {} as { [key: string]: any };
      Object.keys(obj).forEach((key) => {
        cloned[key] = dataUtils.deepClone((obj as any)[key]);
      });
      return cloned as T;
    }
    return obj;
  },
};

// Browser utilities
export const browserUtils = {
  /**
   * Check if running in browser
   */
  isBrowser: (): boolean => typeof window !== "undefined",

  /**
   * Get from local storage
   */
  getFromStorage: <T>(key: string, defaultValue?: T): T | null => {
    if (!browserUtils.isBrowser()) return defaultValue || null;

    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue || null;
    } catch {
      return defaultValue || null;
    }
  },

  /**
   * Save to local storage
   */
  saveToStorage: (key: string, value: any): boolean => {
    if (!browserUtils.isBrowser()) return false;

    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Remove from local storage
   */
  removeFromStorage: (key: string): boolean => {
    if (!browserUtils.isBrowser()) return false;

    try {
      localStorage.removeItem(key);
      return true;
    } catch {
      return false;
    }
  },

  /**
   * Copy text to clipboard
   */
  copyToClipboard: async (text: string): Promise<boolean> => {
    if (!browserUtils.isBrowser()) return false;

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand("copy");
        document.body.removeChild(textArea);
        return true;
      } catch {
        return false;
      }
    }
  },

  /**
   * Download data as file
   */
  downloadFile: (
    data: string,
    filename: string,
    type: string = "text/plain"
  ): boolean => {
    if (!browserUtils.isBrowser()) return false;

    try {
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch {
      return false;
    }
  },
};

// Export utilities
export const exportUtils = {
  /**
   * Convert data to CSV
   */
  toCSV: <T extends Record<string, any>>(
    data: T[],
    columns?: { key: keyof T; header: string }[]
  ): string => {
    if (data.length === 0) return "";

    const cols =
      columns ||
      Object.keys(data[0]).map((key) => ({ key: key as keyof T, header: key }));
    const headers = cols.map((col) => col.header).join(",");

    const rows = data.map((row) =>
      cols
        .map((col) => {
          const value = row[col.key];
          const stringValue =
            value === null || value === undefined ? "" : String(value);
          // Escape quotes and wrap in quotes if contains comma or quote
          return stringValue.includes(",") ||
            stringValue.includes('"') ||
            stringValue.includes("\n")
            ? `"${stringValue.replace(/"/g, '""')}"`
            : stringValue;
        })
        .join(",")
    );

    return [headers, ...rows].join("\n");
  },

  /**
   * Convert data to JSON
   */
  toJSON: <T>(data: T[], pretty: boolean = false): string => {
    return JSON.stringify(data, null, pretty ? 2 : 0);
  },

  /**
   * Generate filename with timestamp
   */
  generateFilename: (prefix: string, extension: string): string => {
    const timestamp = new Date()
      .toISOString()
      .replace(/[:.]/g, "-")
      .slice(0, 19);
    return `${prefix}_${timestamp}.${extension}`;
  },
};

// Error handling utilities
export const errorUtils = {
  /**
   * Extract error message from various error types
   */
  getMessage: (error: any): string => {
    if (typeof error === "string") return error;
    if (error?.message) return error.message;
    if (error?.error) return error.error;
    if (error?.data?.message) return error.data.message;
    return "An unexpected error occurred";
  },

  /**
   * Check if error is a network error
   */
  isNetworkError: (error: any): boolean => {
    return (
      error?.code === "NETWORK_ERROR" ||
      error?.message?.includes("fetch") ||
      error?.message?.includes("network") ||
      !navigator?.onLine
    );
  },

  /**
   * Format error for user display
   */
  formatForUser: (
    error: any
  ): { title: string; message: string; type: "error" | "warning" | "info" } => {
    if (errorUtils.isNetworkError(error)) {
      return {
        title: "Connection Error",
        message: "Please check your internet connection and try again.",
        type: "warning",
      };
    }

    const message = errorUtils.getMessage(error);
    return {
      title: "Error",
      message,
      type: "error",
    };
  },
};

// URL and routing utilities
export const urlUtils = {
  /**
   * Build URL with query parameters
   */
  buildUrl: (base: string, params: Record<string, any>): string => {
    const url = new URL(base, window.location.origin);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        url.searchParams.append(key, String(value));
      }
    });
    return url.toString();
  },

  /**
   * Parse query parameters from URL
   */
  parseQuery: (search?: string): Record<string, string> => {
    const searchString =
      search || (browserUtils.isBrowser() ? window.location.search : "");
    return Object.fromEntries(new URLSearchParams(searchString));
  },

  /**
   * Update URL without navigation
   */
  updateUrl: (params: Record<string, any>, replace: boolean = false): void => {
    if (!browserUtils.isBrowser()) return;

    const url = urlUtils.buildUrl(window.location.pathname, params);
    if (replace) {
      window.history.replaceState({}, "", url);
    } else {
      window.history.pushState({}, "", url);
    }
  },
};
