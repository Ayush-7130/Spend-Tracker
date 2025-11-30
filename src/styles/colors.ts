/**
 * Centralized Color Configuration
 * 
 * This file defines all colors used throughout the application for both light and dark themes.
 * Use these TypeScript constants to reference colors in your components instead of hardcoded values.
 * CSS variables are defined in themes.css and should be used for styling whenever possible.
 */

// ===========================================================================
// LIGHT THEME - Purple Palette
// ===========================================================================

export const lightTheme = {
  // Background Colors
  background: {
    primary: '#F5EFFF',
    secondary: '#FFFFFF',
    tertiary: '#E5D9F2',
    hover: '#E5D9F2',
    active: '#CDC1FF',
  },

  // Text Colors
  text: {
    primary: '#2D1B69',
    secondary: '#4C3D8B',
    tertiary: '#6B5B95',
    inverse: '#FFFFFF',
    placeholder: '#9B8BB8',
  },

  // Border Colors
  border: {
    primary: '#CDC1FF',
    secondary: '#E5D9F2',
    tertiary: '#F5EFFF',
  },

  // Navbar Colors
  navbar: {
    background: '#FFFFFF',
    text: '#2D1B69',
    textHover: '#A294F9',
    accent: '#A294F9',
  },

  // Card Colors
  card: {
    background: '#FFFFFF',
    border: '#E5D9F2',
  },

  // Button Colors
  button: {
    primary: {
      background: '#A294F9',
      text: '#FFFFFF',
      hover: '#8B7BDB',
      active: '#7A6BCF',
    },
    secondary: {
      background: '#F5EFFF',
      text: '#4C3D8B',
      hover: '#E5D9F2',
      active: '#CDC1FF',
      border: '#CDC1FF',
    },
  },

  // Table Colors
  table: {
    background: '#FFFFFF',
    headerBackground: '#F5EFFF',
    headerText: '#2D1B69',
    border: '#E5D9F2',
    rowHover: '#F5EFFF',
    rowEven: '#FEFCFF',
  },

  // Form Colors
  form: {
    inputBackground: '#FFFFFF',
    inputBorder: '#E5D9F2',
    inputBorderFocus: '#A294F9',
    inputText: '#2D1B69',
    inputPlaceholder: '#9B8BB8',
  },

  // Status Colors
  status: {
    success: '#A294F9',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#A294F9',
  },

  // Notification Colors
  notification: {
    success: {
      background: '#F5EFFF',
      text: '#2D1B69',
      border: '#A294F9',
      icon: '#A294F9',
    },
    error: {
      background: '#FEF2F2',
      text: '#991B1B',
      border: '#EF4444',
      icon: '#DC2626',
    },
    warning: {
      background: '#FFFBEB',
      text: '#92400E',
      border: '#F59E0B',
      icon: '#D97706',
    },
    info: {
      background: '#F5EFFF',
      text: '#2D1B69',
      border: '#A294F9',
      icon: '#A294F9',
    },
  },

  // Chart Colors
  chart: {
    primary: '#A294F9',
    secondary: '#22C55E',
    tertiary: '#F59E0B',
    quaternary: '#EF4444',
    grid: '#E5D9F2',
    text: '#6B5B95',
  },

  // Icon Colors
  icon: {
    primary: '#2D1B69',
    secondary: '#4C3D8B',
    accent: '#A294F9',
    success: '#A294F9',
    error: '#EF4444',
    warning: '#F59E0B',
  },
} as const;

// ===========================================================================
// DARK THEME - Professional Dark with Blue Accents
// ===========================================================================

export const darkTheme = {
  // Background Colors
  background: {
    primary: '#0F172A',
    secondary: '#1E293B',
    tertiary: '#334155',
    hover: '#334155',
    active: '#475569',
  },

  // Text Colors
  text: {
    primary: '#E2E8F0',
    secondary: '#CBD5E1',
    tertiary: '#94A3B8',
    inverse: '#0F172A',
    placeholder: '#64748B',
  },

  // Border Colors
  border: {
    primary: '#374151',
    secondary: '#4B5563',
    tertiary: '#334155',
  },

  // Navbar Colors
  navbar: {
    background: '#1E293B',
    text: '#E2E8F0',
    textHover: '#FFFFFF',
    accent: '#FFFFFF',
  },

  // Card Colors
  card: {
    background: '#1E293B',
    border: '#374151',
  },

  // Button Colors
  button: {
    primary: {
      background: '#3B82F6',
      text: '#FFFFFF',
      hover: '#1D4ED8',
      active: '#1E40AF',
    },
    secondary: {
      background: '#374151',
      text: '#E2E8F0',
      hover: '#4B5563',
      active: '#6B7280',
      border: '#4B5563',
    },
  },

  // Table Colors
  table: {
    background: '#1E293B',
    headerBackground: '#1F2937',
    headerText: '#E2E8F0',
    border: '#374151',
    rowHover: '#334155',
    rowEven: '#1A202C',
  },

  // Form Colors
  form: {
    inputBackground: '#1F2937',
    inputBorder: '#4B5563',
    inputBorderFocus: '#3B82F6',
    inputText: '#E2E8F0',
    inputPlaceholder: '#6B7280',
  },

  // Status Colors
  status: {
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Notification Colors
  notification: {
    success: {
      background: '#064E3B',
      text: '#D1FAE5',
      border: '#059669',
      icon: '#10B981',
    },
    error: {
      background: '#7F1D1D',
      text: '#FECACA',
      border: '#DC2626',
      icon: '#EF4444',
    },
    warning: {
      background: '#78350F',
      text: '#FDE68A',
      border: '#D97706',
      icon: '#F59E0B',
    },
    info: {
      background: '#1E3A8A',
      text: '#BFDBFE',
      border: '#2563EB',
      icon: '#3B82F6',
    },
  },

  // Chart Colors
  chart: {
    primary: '#3B82F6',
    secondary: '#10B981',
    tertiary: '#F59E0B',
    quaternary: '#EF4444',
    grid: '#374151',
    text: '#94A3B8',
  },

  // Icon Colors
  icon: {
    primary: '#E2E8F0',
    secondary: '#CBD5E1',
    accent: '#FFFFFF',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
  },
} as const;

// ===========================================================================
// BOOTSTRAP-LIKE COLOR MAPPINGS
// These map to Bootstrap color names for backward compatibility
// ===========================================================================

export const bootstrapColors = {
  light: {
    primary: '#A294F9',    // Purple for light theme
    secondary: '#6C757D',
    success: '#22C55E',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    light: '#F8F9FA',
    dark: '#2D1B69',
  },
  dark: {
    primary: '#3B82F6',    // Blue for dark theme
    secondary: '#6C757D',
    success: '#10B981',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    light: '#F8F9FA',
    dark: '#212529',
  },
} as const;

// ===========================================================================
// CHART COLOR PALETTES
// Extended color sets for charts and data visualization
// ===========================================================================

export const chartPalettes = {
  // Main palette for categories (matches theme)
  primary: [
    '#A294F9', // Purple (light theme primary)
    '#3B82F6', // Blue
    '#22C55E', // Green
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ],

  // Professional palette for dark theme
  professional: [
    '#3B82F6', // Blue
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#EF4444', // Red
    '#8B5CF6', // Violet
    '#06B6D4', // Cyan
    '#84CC16', // Lime
    '#F97316', // Orange
    '#EC4899', // Pink
    '#6366F1', // Indigo
  ],

  // Gradient-friendly colors
  gradient: [
    { from: '#A294F9', to: '#CDC1FF' }, // Purple gradient
    { from: '#3B82F6', to: '#2563EB' }, // Blue gradient
    { from: '#22C55E', to: '#16A34A' }, // Green gradient
    { from: '#F59E0B', to: '#D97706' }, // Amber gradient
    { from: '#EF4444', to: '#DC2626' }, // Red gradient
  ],

  // Status colors for data states
  status: {
    positive: '#22C55E',
    negative: '#EF4444',
    neutral: '#94A3B8',
    pending: '#F59E0B',
    completed: '#10B981',
  },
} as const;

// ===========================================================================
// SEMANTIC COLORS
// Context-specific color mappings
// ===========================================================================

export const semanticColors = {
  // User-specific colors
  users: {
    saket: {
      light: '#A294F9',  // Purple/Primary
      dark: '#3B82F6',   // Blue/Primary
      badge: 'primary',
    },
    ayush: {
      light: '#22C55E',  // Green
      dark: '#10B981',   // Emerald
      badge: 'success',
    },
  },

  // Settlement status colors
  settlement: {
    pending: {
      color: '#F59E0B',
      badge: 'warning',
    },
    settled: {
      color: '#22C55E',
      badge: 'success',
    },
    cancelled: {
      color: '#94A3B8',
      badge: 'secondary',
    },
  },

  // Expense split types
  split: {
    split: {
      color: '#F59E0B',
      badge: 'warning',
    },
    personal: {
      color: '#94A3B8',
      badge: 'light',
    },
  },
} as const;

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Get color based on current theme
 * @param lightColor - Color for light theme
 * @param darkColor - Color for dark theme
 * @param theme - Current theme ('light' | 'dark')
 */
export function getThemeColor(
  lightColor: string,
  darkColor: string,
  theme: 'light' | 'dark'
): string {
  return theme === 'light' ? lightColor : darkColor;
}

/**
 * Get CSS variable reference
 * @param variableName - CSS variable name (without --)
 */
export function getCSSVariable(variableName: string): string {
  return `var(--${variableName})`;
}

/**
 * Get chart color by index (cycles through palette)
 * @param index - Index of color
 * @param theme - Current theme
 */
export function getChartColor(index: number, theme: 'light' | 'dark' = 'light'): string {
  const palette = theme === 'light' ? chartPalettes.primary : chartPalettes.professional;
  return palette[index % palette.length];
}

/**
 * Get user color
 * @param user - User name
 * @param theme - Current theme
 */
export function getUserColor(user: 'saket' | 'ayush', theme: 'light' | 'dark' = 'light'): string {
  return semanticColors.users[user][theme];
}

/**
 * Get status color
 * @param status - Status type
 * @param type - Context type
 */
export function getStatusColor(
  status: string,
  type: 'settlement' | 'split'
): string {
  if (type === 'settlement') {
    const settlementStatus = status as keyof typeof semanticColors.settlement;
    return semanticColors.settlement[settlementStatus]?.color || '#94A3B8';
  } else {
    const splitStatus = status as keyof typeof semanticColors.split;
    return semanticColors.split[splitStatus]?.color || '#94A3B8';
  }
}

// ===========================================================================
// TYPE EXPORTS
// ===========================================================================

export type Theme = 'light' | 'dark';
export type ThemeColors = typeof lightTheme | typeof darkTheme;
export type BootstrapColor = keyof typeof bootstrapColors.light;
export type ChartPalette = keyof typeof chartPalettes;

// ===========================================================================
// CONSTANTS FOR HARDCODED VALUES TO REPLACE
// ===========================================================================

/**
 * Legacy hardcoded colors found in codebase - TO BE REPLACED
 * These are references to help migration
 */
export const LEGACY_COLORS = {
  // From charts.ts
  oldPrimary: '#0d6efd',
  oldSuccess: '#198754',
  oldWarning: '#ffc107',
  oldDanger: '#dc3545',
  oldIndigo: '#6610f2',
  oldOrange: '#fd7e14',
  oldTeal: '#20c997',
  oldPink: '#e83e8c',

  // From Notification.tsx
  oldSuccessBorder: '#d1e7dd',
  oldErrorBorder: '#f5c2c7',
  oldWarningBorder: '#ffecb5',
  oldInfoBorder: '#b6effb',
  oldSecondaryBorder: '#e2e3e5',
} as const;

export default {
  lightTheme,
  darkTheme,
  bootstrapColors,
  chartPalettes,
  semanticColors,
  getThemeColor,
  getCSSVariable,
  getChartColor,
  getUserColor,
  getStatusColor,
};
