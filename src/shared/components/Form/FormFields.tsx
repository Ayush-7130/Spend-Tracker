import React from 'react';
import { 
  InputFieldProps, 
  SelectFieldProps, 
  TextareaFieldProps,
  DateFieldProps,
  CheckboxFieldProps,
  RadioFieldProps,
  fieldSizeClasses,
  fieldVariantClasses 
} from './config';
import { FieldWrapper } from './FormWrappers';

// Input Field Component
export const InputField: React.FC<InputFieldProps & {
  size?: keyof typeof fieldSizeClasses;
  variant?: keyof typeof fieldVariantClasses;
}> = ({
  label,
  type,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  placeholder,
  min,
  max,
  step,
  maxLength,
  pattern,
  autoComplete,
  size = 'md',
  variant = 'default',
  id,
}) => {
  const fieldClasses = `form-control ${fieldSizeClasses[size]} ${fieldVariantClasses[variant]} ${className}`.trim();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = type === 'number' ? 
      (e.target.value ? parseFloat(e.target.value) : '') : 
      e.target.value;
    onChange(newValue);
  };
  
  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      id={id}
    >
      <input
        type={type}
        className={fieldClasses}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        min={min}
        max={max}
        step={step}
        maxLength={maxLength}
        pattern={pattern}
        autoComplete={autoComplete}
        required={required}
      />
    </FieldWrapper>
  );
};

// Select Field Component
export const SelectField: React.FC<SelectFieldProps & {
  size?: keyof typeof fieldSizeClasses;
}> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  placeholder,
  multiple = false,
  size = 'md',
  id,
}) => {
  const fieldClasses = `form-select ${fieldSizeClasses[size]} ${className}`.trim();
  
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (multiple) {
      const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
      onChange(selectedOptions);
    } else {
      onChange(e.target.value);
    }
  };
  
  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      id={id}
    >
      <select
        className={fieldClasses}
        value={value || (multiple ? [] : '')}
        onChange={handleChange}
        disabled={disabled}
        multiple={multiple}
        required={required}
      >
        {placeholder && !multiple && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option, index) => (
          <option
            key={index}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  );
};

// Textarea Field Component
export const TextareaField: React.FC<TextareaFieldProps & {
  size?: keyof typeof fieldSizeClasses;
}> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  rows = 3,
  cols,
  placeholder,
  maxLength,
  resize = 'vertical',
  size = 'md',
  id,
}) => {
  const fieldClasses = `form-control ${fieldSizeClasses[size]} ${className}`.trim();
  const resizeStyle = resize !== 'both' ? { resize } : {};
  
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };
  
  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      id={id}
    >
      <textarea
        className={fieldClasses}
        style={resizeStyle}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        rows={rows}
        cols={cols}
        placeholder={placeholder}
        maxLength={maxLength}
        required={required}
      />
    </FieldWrapper>
  );
};

// Date Field Component
export const DateField: React.FC<DateFieldProps & {
  size?: keyof typeof fieldSizeClasses;
}> = ({
  label,
  value,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  min,
  max,
  step,
  size = 'md',
  id,
}) => {
  const fieldClasses = `form-control ${fieldSizeClasses[size]} ${className}`.trim();
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      id={id}
    >
      <input
        type="date"
        className={fieldClasses}
        value={value || ''}
        onChange={handleChange}
        disabled={disabled}
        min={min}
        max={max}
        step={step}
        required={required}
      />
    </FieldWrapper>
  );
};

// Checkbox Field Component
export const CheckboxField: React.FC<CheckboxFieldProps> = ({
  label,
  checked,
  onChange,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  variant = 'default',
  id,
}) => {
  const fieldId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;
  const isSwitch = variant === 'switch';
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };
  
  return (
    <div className={`${isSwitch ? 'form-check form-switch' : 'form-check'} ${className}`}>
      <input
        type="checkbox"
        className={`form-check-input ${error ? 'is-invalid' : ''}`}
        id={fieldId}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        required={required}
      />
      <label className="form-check-label" htmlFor={fieldId}>
        {label}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      
      {helperText && !error && (
        <div className="form-text text-muted">
          {helperText}
        </div>
      )}
    </div>
  );
};

// Radio Field Component
export const RadioField: React.FC<RadioFieldProps> = ({
  label,
  value,
  onChange,
  options,
  required = false,
  disabled = false,
  error,
  helperText,
  className = '',
  inline = false,
  id,
}) => {
  const groupName = id || `radio-${Math.random().toString(36).substr(2, 9)}`;
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  return (
    <FieldWrapper
      label={label}
      required={required}
      error={error}
      helperText={helperText}
      className={className}
    >
      <div className={`radio-group ${inline ? 'd-flex flex-wrap gap-3' : ''}`}>
        {options.map((option, index) => (
          <div key={index} className="form-check">
            <input
              type="radio"
              className={`form-check-input ${error ? 'is-invalid' : ''}`}
              id={`${groupName}-${index}`}
              name={groupName}
              value={option.value}
              checked={value === option.value}
              onChange={handleChange}
              disabled={disabled || option.disabled}
              required={required}
            />
            <label className="form-check-label" htmlFor={`${groupName}-${index}`}>
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </FieldWrapper>
  );
};