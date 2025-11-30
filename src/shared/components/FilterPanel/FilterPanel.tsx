"use client";

import React from "react";
import { FilterPanelProps, FilterConfig, defaultFilterConfig } from "./config";

export default function FilterPanel({
  filters,
  values,
  onChange,
  onClear,
  loading = false,
  className = "",
  title,
  clearButtonText = defaultFilterConfig.clearButtonText,
  clearButtonVariant = defaultFilterConfig.clearButtonVariant,
  children,
}: FilterPanelProps) {
  const handleDateFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    target.type = "date";
    setTimeout(() => {
      if (target.showPicker) target.showPicker();
    }, 0);
  };

  const handleDateBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (!target.value) target.type = "text";
  };

  const handleDateKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const target = e.target as HTMLInputElement;
    if (target.type === "text") {
      target.type = "date";
      setTimeout(() => {
        if (target.showPicker) target.showPicker();
      }, 0);
    }
  };

  const renderFilter = (filter: FilterConfig) => {
    const colSize = filter.colSize || defaultFilterConfig.colSize;
    // Handle decimal colSize values by converting to percentage (e.g., 1.5 -> 12.5%)
    const colClass = colSize % 1 === 0 ? `col-md-${colSize}` : "";
    const colStyle =
      colSize % 1 !== 0
        ? {
            flex: `0 0 ${(colSize / 12) * 100}%`,
            maxWidth: `${(colSize / 12) * 100}%`,
          }
        : {};

    switch (filter.type) {
      case "text":
        return (
          <div key={filter.key} className={colClass} style={colStyle}>
            <input
              type="text"
              className="form-control"
              placeholder={filter.placeholder || filter.label}
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              disabled={filter.disabled || loading}
              required={filter.required}
            />
          </div>
        );

      case "select":
        return (
          <div key={filter.key} className={colClass} style={colStyle}>
            <select
              className="form-select"
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              disabled={filter.disabled || loading}
              required={filter.required}
            >
              <option value="">
                {filter.placeholder || `All ${filter.label}`}
              </option>
              {filter.options?.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        );

      case "date":
        return (
          <div key={filter.key} className={colClass} style={colStyle}>
            <input
              type="text"
              className="form-control date-text-input"
              value={values[filter.key] || ""}
              onChange={(e) => onChange(filter.key, e.target.value)}
              onFocus={handleDateFocus}
              onBlur={handleDateBlur}
              onKeyDown={handleDateKeyDown}
              placeholder={filter.placeholder || filter.label}
              style={{ cursor: "pointer" }}
              disabled={filter.disabled || loading}
              required={filter.required}
            />
          </div>
        );

      case "daterange":
        return (
          <React.Fragment key={filter.key}>
            <div className={colClass} style={colStyle}>
              <input
                type="text"
                className="form-control date-text-input"
                value={values[`${filter.key}Start`] || ""}
                onChange={(e) => onChange(`${filter.key}Start`, e.target.value)}
                onFocus={handleDateFocus}
                onBlur={handleDateBlur}
                onKeyDown={handleDateKeyDown}
                placeholder={`Start ${filter.label}`}
                style={{ cursor: "pointer" }}
                disabled={filter.disabled || loading}
              />
            </div>
            <div className={colClass} style={colStyle}>
              <input
                type="text"
                className="form-control date-text-input"
                value={values[`${filter.key}End`] || ""}
                onChange={(e) => onChange(`${filter.key}End`, e.target.value)}
                onFocus={handleDateFocus}
                onBlur={handleDateBlur}
                onKeyDown={handleDateKeyDown}
                placeholder={`End ${filter.label}`}
                style={{ cursor: "pointer" }}
                disabled={filter.disabled || loading}
              />
            </div>
          </React.Fragment>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`card mb-4 ${className}`}>
      <div className="card-body">
        {title && (
          <div className="card-header border-0 bg-transparent px-0 pt-0">
            <h6 className="mb-3">{title}</h6>
          </div>
        )}

        <div className="row g-3">
          {filters.map(renderFilter)}

          <div className="col-md-1">
            <button
              className={`btn btn-${clearButtonVariant} w-100`}
              onClick={onClear}
              disabled={loading}
              type="button"
            >
              {loading ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-1"
                    role="status"
                    aria-hidden="true"
                  ></span>
                  Loading...
                </>
              ) : (
                clearButtonText
              )}
            </button>
          </div>
        </div>

        {children && <div className="mt-3">{children}</div>}
      </div>
    </div>
  );
}
