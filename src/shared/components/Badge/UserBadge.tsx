"use client";

import React from "react";
import { UserBadgeProps, userConfig } from "./config";
import { useTheme } from "../../../contexts/ThemeContext";
import { lightTheme, darkTheme, semanticColors } from "../../../styles/colors";

export default function UserBadge({
  user,
  variant = "default",
  showName = true,
  className = "",
}: UserBadgeProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;
  const config = userConfig[user];

  // Get user-specific color from semantic colors
  const userColor = semanticColors.users[user][theme];

  if (variant === "avatar") {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <div
          className="rounded-circle d-flex align-items-center justify-content-center me-2"
          style={{
            width: "24px",
            height: "24px",
            fontSize: "10px",
            backgroundColor: userColor,
            color: colors.text.inverse,
          }}
        >
          {config.avatar}
        </div>
        {showName && (
          <span style={{ color: colors.text.primary }}>{config.name}</span>
        )}
      </div>
    );
  }

  // Default badge variant
  const badgeStyle = {
    backgroundColor: userColor,
    color: colors.text.inverse,
    padding: variant === "small" ? "0.25rem 0.5rem" : "0.35rem 0.65rem",
    fontSize: variant === "small" ? "0.75rem" : "0.875rem",
    fontWeight: "600",
    borderRadius: "0.25rem",
    display: "inline-block",
    lineHeight: "1",
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    verticalAlign: "baseline",
    border: `1px solid ${userColor}`,
  };

  return (
    <span className={`badge ${className}`} style={badgeStyle}>
      {config.name}
    </span>
  );
}
