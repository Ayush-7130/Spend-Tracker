"use client";

import React from "react";
import { StatusBadgeProps, statusTypeConfig } from "./config";
import { useTheme } from "../../../contexts/ThemeContext";
import { lightTheme, darkTheme, semanticColors } from "../../../styles/colors";

export default function StatusBadge({
  status,
  type,
  variant = "default",
  className = "",
  color,
}: StatusBadgeProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  // Get color configuration based on type and status
  const getColorConfig = () => {
    // If custom color provided, use it
    if (color) {
      return {
        bg: color,
        text: colors.text.inverse,
      };
    }

    // Map Bootstrap color names to theme colors
    const mapColorName = (colorName: string) => {
      switch (colorName) {
        case "primary":
          return {
            bg: colors.button.primary.background,
            text: colors.text.inverse,
          };
        case "success":
          return {
            bg: colors.status.success,
            text: colors.text.inverse,
          };
        case "danger":
          return {
            bg: colors.status.error,
            text: colors.text.inverse,
          };
        case "warning":
          return {
            bg: colors.status.warning,
            text: colors.text.primary,
          };
        case "light":
          return {
            bg: colors.card.background,
            text: colors.text.primary,
          };
        case "secondary":
        default:
          return {
            bg: colors.button.secondary.background,
            text: colors.button.secondary.text,
          };
      }
    };

    // Get color name from config
    let colorName = "secondary";
    switch (type) {
      case "user":
        colorName =
          statusTypeConfig.user[status as keyof typeof statusTypeConfig.user] ||
          "secondary";
        break;
      case "split":
        colorName =
          statusTypeConfig.split[
            status as keyof typeof statusTypeConfig.split
          ] || "secondary";
        break;
      case "settlement":
        colorName =
          statusTypeConfig.settlement[
            status as keyof typeof statusTypeConfig.settlement
          ] || "secondary";
        break;
      case "category":
        colorName = "secondary";
        break;
      default:
        colorName = "secondary";
    }

    return mapColorName(colorName);
  };

  // Format status text
  const getStatusText = () => {
    switch (type) {
      case "split":
        return status === "split" ? "Split" : "Personal";
      case "settlement":
        return status.charAt(0).toUpperCase() + status.slice(1);
      case "user":
        return status.charAt(0).toUpperCase() + status.slice(1);
      default:
        return status;
    }
  };

  const colorConfig = getColorConfig();

  const badgeStyle = {
    backgroundColor: colorConfig.bg,
    color: colorConfig.text,
    padding: variant === "small" ? "0.25rem 0.5rem" : "0.35rem 0.65rem",
    fontSize: variant === "small" ? "0.75rem" : "0.875rem",
    fontWeight: "600",
    borderRadius: "0.25rem",
    display: "inline-block",
    lineHeight: "1",
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    verticalAlign: "baseline",
    border: `1px solid ${colorConfig.bg}`,
  };

  return (
    <span className={`badge ${className}`} style={badgeStyle}>
      {getStatusText()}
    </span>
  );
}
