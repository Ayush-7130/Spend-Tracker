/**
 * Export Button Component
 *
 * Reusable button for exporting data to CSV.
 * Handles download trigger and error states.
 */

"use client";

import React, { useState } from "react";

export interface ExportButtonProps {
  /**
   * API endpoint for export
   */
  endpoint: string;

  /**
   * Query parameters to include in export
   */
  params?: Record<string, string>;

  /**
   * Button label
   */
  label?: string;

  /**
   * Button variant
   */
  variant?:
    | "primary"
    | "secondary"
    | "success"
    | "danger"
    | "warning"
    | "info"
    | "outline-primary"
    | "outline-secondary";

  /**
   * Button size
   */
  size?: "sm" | "md" | "lg";

  /**
   * Icon class (Bootstrap Icons)
   */
  icon?: string;

  /**
   * Disabled state
   */
  disabled?: boolean;

  /**
   * Custom class name
   */
  className?: string;

  /**
   * Success callback
   */
  onSuccess?: () => void;

  /**
   * Error callback
   */
  onError?: (error: string) => void;
}

export default function ExportButton({
  endpoint,
  params = {},
  label = "Export CSV",
  variant = "outline-primary",
  size = "md",
  icon = "bi-download",
  disabled = false,
  className = "",
  onSuccess,
  onError,
}: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);

    try {
      // Build query string
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value);
        }
      });

      const queryString = queryParams.toString();
      const url = queryString ? `${endpoint}?${queryString}` : endpoint;

      // Fetch export
      const response = await fetch(url);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Export failed");
      }

      // Get filename from Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "export.csv";

      if (contentDisposition) {
        // Match filename with or without quotes, but don't capture the quotes
        const filenameMatch = contentDisposition.match(
          /filename=["']?([^"';]+)["']?/i
        );
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].trim();
        }
      }

      // Download file
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      if (onError) {
        onError(error.message || "Failed to export data");
      }
    } finally {
      setLoading(false);
    }
  };

  const sizeClass = size === "sm" ? "btn-sm" : size === "lg" ? "btn-lg" : "";

  return (
    <button
      className={`btn btn-${variant} ${sizeClass} ${className}`}
      onClick={handleExport}
      disabled={disabled || loading}
      type="button"
    >
      {loading ? (
        <>
          <span
            className="spinner-border spinner-border-sm me-2"
            role="status"
            aria-hidden="true"
          ></span>
          Exporting...
        </>
      ) : (
        <>
          {icon && <i className={`${icon} me-2`}></i>}
          {label}
        </>
      )}
    </button>
  );
}
