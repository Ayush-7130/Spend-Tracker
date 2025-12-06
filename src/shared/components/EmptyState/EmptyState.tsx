"use client";

import React from "react";
import { EmptyStateConfig } from "./config";
import { useTheme } from "../../../contexts/ThemeContext";
import { lightTheme, darkTheme } from "../../../styles/colors";

export interface EmptyStateProps extends EmptyStateConfig {
  className?: string;
  style?: React.CSSProperties;
}

export default function EmptyState({
  title = "No data available",
  description = "There is no data to display at this time.",
  actions = [],
  size = "medium",
  variant = "default",
  className = "",
  centered = true,
  showBorder = false,
  style,
}: EmptyStateProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations - padding only
  const sizePadding = {
    small: {
      paddingTop: "1.5rem",
      paddingBottom: "1.5rem",
      paddingLeft: "1rem",
      paddingRight: "1rem",
    },
    medium: {
      paddingTop: "3rem",
      paddingBottom: "3rem",
      paddingLeft: "1.5rem",
      paddingRight: "1.5rem",
    },
    large: {
      paddingTop: "4rem",
      paddingBottom: "4rem",
      paddingLeft: "2rem",
      paddingRight: "2rem",
    },
  };

  // Variant color configurations using theme colors
  const variantColors = {
    default: colors.text.secondary,
    error: colors.status.error,
    search: colors.status.info,
    filter: colors.status.warning,
  };

  // Title size configurations
  const titleSizes = {
    small: { fontSize: "1.125rem", fontWeight: 500 },
    medium: { fontSize: "1.25rem", fontWeight: 600 },
    large: { fontSize: "1.5rem", fontWeight: 700 },
  };

  // Description size configurations
  const descSizes = {
    small: { fontSize: "0.875rem" },
    medium: { fontSize: "1rem" },
    large: { fontSize: "1.125rem" },
  };

  // Get text color based on variant
  const variantTextColor = variantColors[variant];

  // Border and background styles when showBorder is true
  const borderStyles = showBorder
    ? {
        border: `1px solid ${colors.border.primary}`,
        borderRadius: "var(--radius-lg)",
        backgroundColor: colors.background.tertiary,
      }
    : {};

  return (
    <div
      className={className}
      style={{
        ...sizePadding[size],
        textAlign: centered ? "center" : "left",
        ...borderStyles,
        ...style,
      }}
    >
      {/* Title */}
      <h3
        className="empty-state-title mb-2"
        style={{
          ...titleSizes[size],
          marginBottom: "0.5rem",
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        className="empty-state-description mb-6"
        style={{
          ...descSizes[size],
          color: variantTextColor,
          marginBottom: "1.5rem",
        }}
      >
        {description}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="empty-state-actions">
          {actions.map((action, index) => {
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`empty-state-action-btn ${action.variant === "outline" ? "empty-state-btn-outline" : action.variant === "secondary" ? "empty-state-btn-secondary" : "empty-state-btn-primary"}`}
              >
                {action.icon && (
                  <span className="empty-state-btn-icon" aria-hidden="true">
                    {action.icon === "plus" ? "➕" : action.icon}
                  </span>
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
