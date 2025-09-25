/**
 * Common UI components and patterns utilities
 */

/**
 * Standard loading spinner configuration
 */
export const LoadingSpinner = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Loading...</span>
    </div>
  </div>
);

/**
 * Standard error alert configuration
 */
export const ErrorAlert = ({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry?: () => void;
}) => (
  <div className="alert alert-danger" role="alert">
    <i className="bi bi-exclamation-triangle me-2"></i>
    {error}
    {onRetry && (
      <button 
        className="btn btn-outline-danger btn-sm ms-3"
        onClick={onRetry}
      >
        Retry
      </button>
    )}
  </div>
);

/**
 * Standard empty state component
 */
export const EmptyState = ({ 
  icon, 
  title, 
  description,
  actionButton 
}: {
  icon: string;
  title: string;
  description: string;
  actionButton?: {
    text: string;
    href?: string;
    onClick?: () => void;
  };
}) => (
  <div className="text-center py-5">
    <i className={`${icon} display-1 text-muted mb-3`}></i>
    <h4 className="text-muted">{title}</h4>
    <p className="text-muted">{description}</p>
    {actionButton && (
      actionButton.href ? (
        <a href={actionButton.href} className="btn btn-primary">
          {actionButton.text}
        </a>
      ) : (
        <button 
          className="btn btn-primary" 
          onClick={actionButton.onClick}
        >
          {actionButton.text}
        </button>
      )
    )}
  </div>
);

/**
 * Standard page header component
 */
export const PageHeader = ({
  title,
  icon,
  description,
  actions
}: {
  title: string;
  icon?: string;
  description?: string;
  actions?: Array<{
    text: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    size?: 'sm' | 'lg';
  }>;
}) => (
  <div className="d-flex justify-content-between align-items-center mb-4">
    <div>
      <h1 className="h3 mb-1">
        {icon && <i className={`${icon} me-2`}></i>}
        {title}
      </h1>
      {description && <p className="text-muted mb-0">{description}</p>}
    </div>
    {actions && actions.length > 0 && (
      <div className="d-flex gap-2">
        {actions.map((action, index) => (
          action.href ? (
            <a
              key={index}
              href={action.href}
              className={`btn btn-${action.variant || 'primary'} ${action.size ? `btn-${action.size}` : ''}`}
            >
              {action.text}
            </a>
          ) : (
            <button
              key={index}
              onClick={action.onClick}
              className={`btn btn-${action.variant || 'primary'} ${action.size ? `btn-${action.size}` : ''}`}
            >
              {action.text}
            </button>
          )
        ))}
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
  className = ""
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
    <div className="card-body">
      {children}
    </div>
  </div>
);

/**
 * Standard filter component
 */
export const FilterBar = ({
  filters,
  onFilterChange,
  onReset
}: {
  filters: Array<{
    key: string;
    label: string;
    type: 'text' | 'select' | 'date';
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
            {filter.type === 'select' ? (
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
          <button 
            className="btn btn-outline-secondary"
            onClick={onReset}
          >
            <i className="bi bi-x-circle me-1"></i>
            Reset Filters
          </button>
        </div>
      </div>
    </div>
  </div>
);