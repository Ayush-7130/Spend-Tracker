"use client";

import React from "react";
import { StatsCardProps, defaultStatsCardConfig } from "../config";
import LoadingSpinner from "../../LoadingSpinner/LoadingSpinner";
import { useTheme } from "../../../../contexts/ThemeContext";
import { lightTheme, darkTheme } from "../../../../styles/colors";

export default function StatsCard({
  title,
  value,
  icon,
  variant = defaultStatsCardConfig.variant,
  trend,
  subtitle,
  footer,
  loading = false,
  className = "",
  size = defaultStatsCardConfig.size,
  onClick,
}: StatsCardProps) {
  const { theme } = useTheme();
  const colors = theme === "light" ? lightTheme : darkTheme;

  const sizeClasses = {
    sm: "p-1",
    md: "p-3",
    lg: "p-5",
  };

  const cardClass = [
    "card",
    "h-100",
    onClick ? "cursor-pointer" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  // Get icon color based on variant
  const getIconColor = () => {
    switch (variant) {
      case "primary":
        return colors.button.primary.background;
      case "secondary":
        return colors.button.secondary.text;
      case "success":
        return colors.status.success;
      case "danger":
        return colors.status.error;
      case "warning":
        return colors.status.warning;
      case "info":
        return colors.status.info;
      case "light":
        return colors.text.secondary;
      case "dark":
        return colors.text.primary;
      default:
        return colors.button.primary.background;
    }
  };

  const iconColor = getIconColor();

  if (loading) {
    return (
      <div
        className={cardClass}
        style={{
          backgroundColor: colors.card.background,
          borderColor: colors.card.border,
        }}
      >
        <div className={`card-body ${sizeClasses[size]} text-center`}>
          <LoadingSpinner
            config={{
              size: "small",
              showText: false,
              variant: "secondary",
              centered: true,
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={cardClass}
      onClick={onClick}
      style={{
        backgroundColor: colors.card.background,
        borderColor: colors.card.border,
      }}
    >
      <div className={`card-body ${sizeClasses[size]}`}>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h6
              className="card-title mb-2"
              style={{ color: colors.text.secondary }}
            >
              {title}
            </h6>
            <h4 className="mb-0 fw-bold" style={{ color: colors.text.primary }}>
              {value}
            </h4>
            {subtitle && (
              <small style={{ color: colors.text.secondary }}>{subtitle}</small>
            )}
            {trend && (
              <div className="mt-2">
                <span
                  className="small"
                  style={{
                    color: trend.isPositive
                      ? colors.status.success
                      : colors.status.error,
                  }}
                >
                  <i
                    className={`bi ${trend.isPositive ? "bi-arrow-up" : "bi-arrow-down"} me-1`}
                    style={{
                      color: trend.isPositive
                        ? colors.status.success
                        : colors.status.error,
                    }}
                  ></i>
                  {Math.abs(trend.value)}%
                  {trend.label && (
                    <span
                      className="ms-1"
                      style={{ color: colors.text.secondary }}
                    >
                      {trend.label}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="ms-3">
              <i className={`${icon} fs-2`} style={{ color: iconColor }}></i>
            </div>
          )}
        </div>
        {footer && (
          <div
            className="mt-3 pt-3 border-top"
            style={{ borderColor: colors.border.primary }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
