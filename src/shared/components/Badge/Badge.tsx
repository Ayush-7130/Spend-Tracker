"use client";

import React from "react";
import { BadgeProps } from "./config";
import { useTheme } from "../../../contexts/ThemeContext";
import { lightTheme, darkTheme } from "../../../styles/colors";

export default function Badge({
  children,
  variant = "secondary",
  size = "md",
  className = "",
  outline = false,
}: BadgeProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Size configurations
  const sizeStyles = {
    sm: { padding: "0.25rem 0.5rem", fontSize: "0.75rem" },
    md: { padding: "0.35rem 0.65rem", fontSize: "0.875rem" },
    lg: { padding: "0.5rem 0.75rem", fontSize: "1rem" },
  };

  // Get color based on variant
  const getColorConfig = () => {
    switch (variant) {
      case "primary":
        return {
          bg: colors.button.primary.background,
          text: colors.text.inverse,
          border: colors.button.primary.background,
        };
      case "secondary":
        return {
          bg: colors.button.secondary.background,
          text: colors.button.secondary.text,
          border: colors.button.secondary.border,
        };
      case "success":
        return {
          bg: colors.status.success,
          text: colors.text.inverse,
          border: colors.status.success,
        };
      case "danger":
        return {
          bg: colors.status.error,
          text: colors.text.inverse,
          border: colors.status.error,
        };
      case "warning":
        return {
          bg: colors.status.warning,
          text: colors.text.primary,
          border: colors.status.warning,
        };
      case "info":
        return {
          bg: colors.status.info,
          text: colors.text.inverse,
          border: colors.status.info,
        };
      case "light":
        return {
          bg: colors.card.background,
          text: colors.text.primary,
          border: colors.border.primary,
        };
      case "dark":
        return {
          bg: theme === "light" ? "#343a40" : "#1a1d23",
          text: colors.text.inverse,
          border: theme === "light" ? "#343a40" : "#1a1d23",
        };
      default:
        return {
          bg: colors.button.secondary.background,
          text: colors.button.secondary.text,
          border: colors.button.secondary.border,
        };
    }
  };

  const colorConfig = getColorConfig();
  const sizeStyle = sizeStyles[size];

  const badgeStyle = outline
    ? {
        backgroundColor: "transparent",
        color: colorConfig.bg,
        border: `1px solid ${colorConfig.border}`,
        ...sizeStyle,
      }
    : {
        backgroundColor: colorConfig.bg,
        color: colorConfig.text,
        border: `1px solid ${colorConfig.border}`,
        ...sizeStyle,
      };

  return (
    <span
      className={`badge ${className}`}
      style={{
        ...badgeStyle,
        display: "inline-block",
        borderRadius: "0.25rem",
        fontWeight: "600",
        lineHeight: "1",
        textAlign: "center",
        whiteSpace: "nowrap",
        verticalAlign: "baseline",
      }}
    >
      {children}
    </span>
  );
}
