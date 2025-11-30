/**
 * Common UI components and patterns utilities
 */

// LoadingSpinner moved to shared components - use import { LoadingSpinner } from '@/shared/components';

/**
 * Standard error alert configuration
 */
export const ErrorAlert = ({
  error,
  onRetry,
}: {
  error: string;
  onRetry?: () => void;
}) => (
  <div className="alert alert-danger" role="alert">
    <i className="bi bi-exclamation-triangle me-2"></i>
    {error}
    {onRetry && (
      <button
        className="btn btn-sm ms-3"
        onClick={onRetry}
        style={{
          backgroundColor: "transparent",
          color: "var(--status-error)",
          border: "1px solid var(--status-error)",
          padding: "0.25rem 0.75rem",
        }}
      >
        Retry
      </button>
    )}
  </div>
);

// EmptyState moved to shared components - use import { EmptyState } from '@/shared/components';

/**
 * Standard page header component
 */
export const PageHeader = ({
  title,
  icon,
  description,
  actions,
}: {
  title: string;
  icon?: string;
  description?: string;
  actions?: Array<{
    text: string;
    href?: string;
    onClick?: () => void;
    variant?:
      | "primary"
      | "secondary"
      | "success"
      | "warning"
      | "danger"
      | "info";
    size?: "sm" | "lg";
  }>;
}) => (
  <div className="d-flex justify-content-between align-items-center mb-4">
    <div>
      <h1 className="h3 mb-1">
        {icon && <i className={`${icon} me-2`}></i>}
        {title}
      </h1>
      {description && (
        <p className="mb-0" style={{ color: "var(--text-secondary)" }}>
          {description}
        </p>
      )}
    </div>
    {actions && actions.length > 0 && (
      <div className="d-flex gap-2">
        {actions.map((action, index) =>
          action.href ? (
            <a
              key={index}
              href={action.href}
              className={`btn btn-${action.variant || "primary"} ${
                action.size ? `btn-${action.size}` : ""
              }`}
            >
              {action.text}
            </a>
          ) : (
            <button
              key={index}
              onClick={action.onClick}
              className={`btn btn-${action.variant || "primary"} ${
                action.size ? `btn-${action.size}` : ""
              }`}
            >
              {action.text}
            </button>
          )
        )}
      </div>
    )}
  </div>
);

/**
 * Standard card component
 */
export const Card = ({
  title,
  icon,
  children,
  actions,
  className = "",
}: {
  title?: string;
  icon?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) => (
  <div className={`card ${className}`}>
    {title && (
      <div className="card-header">
        <div className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">
            {icon && <i className={`${icon} me-2`}></i>}
            {title}
          </h5>
          {actions && <div>{actions}</div>}
        </div>
      </div>
    )}
    <div className="card-body">{children}</div>
  </div>
);

/**
 * Standard filter component
 */
export const FilterBar = ({
  filters,
  onFilterChange,
  onReset,
}: {
  filters: Array<{
    key: string;
    label: string;
    type: "text" | "select" | "date";
    value: string;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
  }>;
  onFilterChange: (key: string, value: string) => void;
  onReset: () => void;
}) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="row g-3">
        {filters.map((filter) => (
          <div key={filter.key} className="col-md-3">
            <label className="form-label">{filter.label}</label>
            {filter.type === "select" ? (
              <select
                className="form-select"
                value={filter.value}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
              >
                <option value="">All</option>
                {filter.options?.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type={filter.type}
                className="form-control"
                placeholder={filter.placeholder}
                value={filter.value}
                onChange={(e) => onFilterChange(filter.key, e.target.value)}
              />
            )}
          </div>
        ))}
        <div className="col-md-12">
          <button className="btn btn-outline-secondary" onClick={onReset}>
            <i className="bi bi-x-circle me-1"></i>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  </div>
);
