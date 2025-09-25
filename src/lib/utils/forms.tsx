/**
 * Form handling utilities
 */

import { useState, useCallback } from 'react';

/**
 * Generic form state hook
 */
export const useFormState = <T extends Record<string, unknown>>(
  initialState: T,
  onSubmit?: (data: T) => Promise<void> | void
) => {
  const [formData, setFormData] = useState<T>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});

  const updateField = useCallback((field: keyof T, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is updated
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  const updateMultipleFields = useCallback((updates: Partial<T>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialState);
    setErrors({});
  }, [initialState]);

  const validateForm = useCallback((validators: Partial<Record<keyof T, (value: unknown) => string | undefined>>) => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;

    Object.entries(validators).forEach(([field, validator]) => {
      if (validator) {
        const error = validator(formData[field as keyof T]);
        if (error) {
          newErrors[field as keyof T] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [formData]);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (onSubmit) {
      setIsSubmitting(true);
      try {
        await onSubmit(formData);
      } catch (error) {
        console.error('Form submission error:', error);
      } finally {
        setIsSubmitting(false);
      }
    }
  }, [formData, onSubmit]);

  return {
    formData,
    isSubmitting,
    errors,
    updateField,
    updateMultipleFields,
    resetForm,
    validateForm,
    handleSubmit
  };
};

/**
 * Common form validators
 */
export const validators = {
  required: (value: unknown) => {
    if (!value || (typeof value === 'string' && value.trim() === '')) {
      return 'This field is required';
    }
    return undefined;
  },

  minLength: (min: number) => (value: string) => {
    if (value && value.length < min) {
      return `Must be at least ${min} characters long`;
    }
    return undefined;
  },

  maxLength: (max: number) => (value: string) => {
    if (value && value.length > max) {
      return `Must be no more than ${max} characters long`;
    }
    return undefined;
  },

  number: (value: unknown) => {
    if (value && isNaN(Number(value))) {
      return 'Must be a valid number';
    }
    return undefined;
  },

  positiveNumber: (value: unknown) => {
    const numValue = Number(value);
    if (value && (isNaN(numValue) || numValue <= 0)) {
      return 'Must be a positive number';
    }
    return undefined;
  },

  email: (value: string) => {
    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return 'Must be a valid email address';
    }
    return undefined;
  },

  date: (value: string) => {
    if (value && isNaN(Date.parse(value))) {
      return 'Must be a valid date';
    }
    return undefined;
  }
};

/**
 * Input component with error handling
 */
export const FormInput = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  className = ''
}: {
  label: string;
  name: string;
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'textarea';
  value: string | number;
  onChange: (value: string | number) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) => (
  <div className={`mb-3 ${className}`}>
    <label htmlFor={name} className="form-label">
      {label}
      {required && <span className="text-danger">*</span>}
    </label>
    {type === 'textarea' ? (
      <textarea
        id={name}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
      />
    ) : (
      <input
        id={name}
        type={type}
        className={`form-control ${error ? 'is-invalid' : ''}`}
        value={value}
        onChange={(e) => onChange(type === 'number' ? Number(e.target.value) : e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    )}
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
);

/**
 * Select component with error handling
 */
export const FormSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  error,
  required = false,
  disabled = false,
  className = ''
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) => (
  <div className={`mb-3 ${className}`}>
    <label htmlFor={name} className="form-label">
      {label}
      {required && <span className="text-danger">*</span>}
    </label>
    <select
      id={name}
      className={`form-select ${error ? 'is-invalid' : ''}`}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
    >
      <option value="">Select {label}</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
    {error && <div className="invalid-feedback">{error}</div>}
  </div>
);