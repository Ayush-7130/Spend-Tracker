import React from "react";
import { FieldWrapperProps, FormGroupProps } from "./config";

// Field Wrapper Component
export const FieldWrapper: React.FC<FieldWrapperProps> = ({
  label,
  required = false,
  error,
  helperText,
  children,
  className = "",
  labelClassName = "",
  id,
}) => {
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`mb-3 ${className}`}>
      {label && (
        <label htmlFor={fieldId} className={`form-label ${labelClassName}`}>
          {label}
          {required && (
            <span className="ms-1" style={{ color: "var(--status-error)" }}>
              *
            </span>
          )}
        </label>
      )}

      <div className="position-relative">
        {React.cloneElement(children as React.ReactElement<any>, {
          id: fieldId,
          className:
            `${(children as React.ReactElement<any>).props.className || ""} ${
              error ? "is-invalid" : ""
            }`.trim(),
        })}

        {error && <div className="invalid-feedback d-block">{error}</div>}
      </div>

      {helperText && !error && (
        <div className="form-text" style={{ color: "var(--text-secondary)" }}>
          {helperText}
        </div>
      )}
    </div>
  );
};

// Form Group Component
export const FormGroup: React.FC<FormGroupProps> = ({
  children,
  title,
  description,
  className = "",
  collapsible = false,
  defaultCollapsed = false,
}) => {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapse = () => {
    if (collapsible) {
      setIsCollapsed(!isCollapsed);
    }
  };

  return (
    <div className={`form-group-wrapper ${className}`}>
      {title && (
        <div
          className={`form-group-header ${collapsible ? "cursor-pointer" : ""}`}
          onClick={toggleCollapse}
        >
          <h6 className="mb-1 d-flex align-items-center">
            {title}
            {collapsible && (
              <i
                className={`bi ${
                  isCollapsed ? "bi-chevron-right" : "bi-chevron-down"
                } ms-2`}
              />
            )}
          </h6>
          {description && (
            <small style={{ color: "var(--text-secondary)" }}>
              {description}
            </small>
          )}
        </div>
      )}

      <div
        className={`form-group-content ${
          collapsible && isCollapsed ? "d-none" : ""
        }`}
      >
        {children}
      </div>
    </div>
  );
};
