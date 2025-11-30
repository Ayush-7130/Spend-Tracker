// LoadingSpinner configuration types
export interface LoadingSpinnerConfig {
  size?: "small" | "medium" | "large";
  variant?: "primary" | "secondary" | "light" | "dark";
  text?: string;
  showText?: boolean;
  centered?: boolean;
  overlay?: boolean;
  className?: string;
}

// Default configurations
export const DefaultLoadingConfigs = {
  // Basic spinner
  basic: (text?: string): LoadingSpinnerConfig => ({
    size: "medium",
    variant: "primary",
    text: text || "Loading...",
    showText: true,
    centered: true,
  }),

  // Small inline spinner
  inline: (): LoadingSpinnerConfig => ({
    size: "small",
    variant: "primary",
    showText: false,
    centered: false,
  }),

  // Overlay spinner for full-screen loading
  overlay: (text?: string): LoadingSpinnerConfig => ({
    size: "large",
    variant: "light",
    text: text || "Loading...",
    showText: true,
    centered: true,
    overlay: true,
  }),

  // Table loading spinner
  table: (text?: string): LoadingSpinnerConfig => ({
    size: "medium",
    variant: "primary",
    text: text || "Loading data...",
    showText: true,
    centered: true,
    className: "table-loading-spinner",
  }),
};
