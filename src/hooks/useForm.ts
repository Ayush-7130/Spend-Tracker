/**
 * Generic Form Hook
 *
 * Reusable hook for form state management, validation, and submission.
 * Handles common form patterns like field changes, validation, errors,
 * and loading states.
 */

import { useState, useCallback, ChangeEvent, FormEvent } from "react";

// ===========================================================================
// TYPES
// ===========================================================================

export interface ValidationRule<TValue = any> {
  /** Validation function that returns error message or null */
  validate: (value: TValue, allValues?: any) => string | null;
  /** Error message to display */
  message?: string;
}

export interface FieldConfig<TValue = any> {
  /** Initial value */
  initialValue: TValue;
  /** Validation rules */
  rules?: ValidationRule<TValue>[];
  /** Transform value before setting (e.g., trim, lowercase) */
  transform?: (value: TValue) => TValue;
}

export interface FormConfig<TFormData extends Record<string, any>> {
  /** Field configurations */
  fields: {
    [K in keyof TFormData]: FieldConfig<TFormData[K]>;
  };
  /** Form-level validation */
  validate?: (values: TFormData) => Record<string, string> | null;
  /** Submit handler */
  onSubmit: (values: TFormData) => Promise<void> | void;
  /** Success callback */
  onSuccess?: (values: TFormData) => void;
  /** Error callback */
  onError?: (error: string) => void;
}

export interface UseFormResult<TFormData extends Record<string, any>> {
  /** Form values */
  values: TFormData;
  /** Field errors */
  errors: Partial<Record<keyof TFormData, string>>;
  /** Touched fields */
  touched: Partial<Record<keyof TFormData, boolean>>;
  /** Is form submitting */
  isSubmitting: boolean;
  /** Is form valid */
  isValid: boolean;
  /** Has form been submitted */
  hasSubmitted: boolean;
  /** Handle field change */
  handleChange: (
    field: keyof TFormData
  ) => (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => void;
  /** Set field value directly */
  setFieldValue: (field: keyof TFormData, value: any) => void;
  /** Set multiple field values */
  setValues: (values: Partial<TFormData>) => void;
  /** Handle field blur */
  handleBlur: (field: keyof TFormData) => () => void;
  /** Validate single field */
  validateField: (field: keyof TFormData) => string | null;
  /** Validate all fields */
  validateForm: () => boolean;
  /** Handle form submit */
  handleSubmit: (e?: FormEvent) => Promise<void>;
  /** Reset form to initial values */
  reset: () => void;
  /** Set form errors manually */
  setErrors: (errors: Partial<Record<keyof TFormData, string>>) => void;
  /** Clear all errors */
  clearErrors: () => void;
  /** Get field props (value, onChange, onBlur) */
  getFieldProps: (field: keyof TFormData) => {
    value: TFormData[typeof field];
    onChange: (
      e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    onBlur: () => void;
    name: string;
  };
}

// ===========================================================================
// BUILT-IN VALIDATORS
// ===========================================================================

export const validators = {
  required: (message = "This field is required"): ValidationRule => ({
    validate: (value) => {
      if (value === null || value === undefined || value === "") {
        return message;
      }
      if (typeof value === "string" && value.trim() === "") {
        return message;
      }
      return null;
    },
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value === "string" && value.length < min) {
        return message || `Must be at least ${min} characters`;
      }
      return null;
    },
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value === "string" && value.length > max) {
        return message || `Must be at most ${max} characters`;
      }
      return null;
    },
  }),

  email: (message = "Invalid email address"): ValidationRule<string> => ({
    validate: (value) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (typeof value === "string" && value && !emailRegex.test(value)) {
        return message;
      }
      return null;
    },
  }),

  min: (min: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (typeof value === "number" && value < min) {
        return message || `Must be at least ${min}`;
      }
      return null;
    },
  }),

  max: (max: number, message?: string): ValidationRule<number> => ({
    validate: (value) => {
      if (typeof value === "number" && value > max) {
        return message || `Must be at most ${max}`;
      }
      return null;
    },
  }),

  pattern: (
    regex: RegExp,
    message = "Invalid format"
  ): ValidationRule<string> => ({
    validate: (value) => {
      if (typeof value === "string" && value && !regex.test(value)) {
        return message;
      }
      return null;
    },
  }),

  matches: (
    field: string,
    message = "Fields do not match"
  ): ValidationRule => ({
    validate: (value, allValues) => {
      if (allValues && value !== allValues[field]) {
        return message;
      }
      return null;
    },
  }),

  custom: (
    validator: (value: any, allValues?: any) => boolean,
    message: string
  ): ValidationRule => ({
    validate: (value, allValues) => {
      if (!validator(value, allValues)) {
        return message;
      }
      return null;
    },
  }),
};

// ===========================================================================
// HOOK: useForm
// Generic form management hook
// ===========================================================================

/**
 * Generic hook for form state and validation management
 *
 * @example
 * ```tsx
 * const form = useForm({
 *   fields: {
 *     email: {
 *       initialValue: '',
 *       rules: [validators.required(), validators.email()]
 *     },
 *     amount: {
 *       initialValue: 0,
 *       rules: [validators.required(), validators.min(0)]
 *     }
 *   },
 *   onSubmit: async (values) => {
 *     await createExpense(values);
 *   }
 * });
 * ```
 */
export function useForm<TFormData extends Record<string, any>>(
  config: FormConfig<TFormData>
): UseFormResult<TFormData> {
  const {
    fields,
    validate: formValidate,
    onSubmit,
    onSuccess,
    onError,
  } = config;

  // Initialize values from field configs
  const initialValues = Object.keys(fields).reduce((acc, key) => {
    acc[key as keyof TFormData] = fields[key as keyof TFormData].initialValue;
    return acc;
  }, {} as TFormData);

  const [values, setValues] = useState<TFormData>(initialValues);
  const [errors, setErrors] = useState<
    Partial<Record<keyof TFormData, string>>
  >({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof TFormData, boolean>>
  >({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Validate a single field
  const validateField = useCallback(
    (field: keyof TFormData): string | null => {
      const fieldConfig = fields[field];
      const value = values[field];

      if (!fieldConfig.rules) {
        return null;
      }

      for (const rule of fieldConfig.rules) {
        const error = rule.validate(value, values);
        if (error) {
          return error;
        }
      }

      return null;
    },
    [fields, values]
  );

  // Validate all fields
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof TFormData, string>> = {};
    let isValid = true;

    // Validate each field
    Object.keys(fields).forEach((key) => {
      const field = key as keyof TFormData;
      const error = validateField(field);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    // Run form-level validation
    if (formValidate) {
      const formErrors = formValidate(values);
      if (formErrors) {
        Object.assign(newErrors, formErrors);
        isValid = false;
      }
    }

    setErrors(newErrors);
    return isValid;
  }, [fields, values, validateField, formValidate]);

  // Handle field change
  const handleChange = useCallback(
    (field: keyof TFormData) =>
      (
        e: ChangeEvent<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >
      ) => {
        const target = e.target as HTMLInputElement;
        let value: any = target.value;

        // Handle checkboxes
        if (target.type === "checkbox") {
          value = target.checked;
        }
        // Handle numbers
        else if (target.type === "number") {
          value = target.value === "" ? "" : Number(target.value);
        }

        // Apply transform if provided
        const fieldConfig = fields[field];
        if (fieldConfig.transform) {
          value = fieldConfig.transform(value);
        }

        setValues((prev) => ({ ...prev, [field]: value }));

        // Clear error when user types (if already touched)
        if (touched[field] && errors[field]) {
          const error = validateField(field);
          if (!error) {
            setErrors((prev) => {
              const newErrors = { ...prev };
              delete newErrors[field];
              return newErrors;
            });
          }
        }
      },
    [fields, touched, errors, validateField]
  );

  // Set field value directly
  const setFieldValue = useCallback((field: keyof TFormData, value: any) => {
    setValues((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Set multiple values
  const setValuesCallback = useCallback((newValues: Partial<TFormData>) => {
    setValues((prev) => ({ ...prev, ...newValues }));
  }, []);

  // Handle field blur
  const handleBlur = useCallback(
    (field: keyof TFormData) => () => {
      setTouched((prev) => ({ ...prev, [field]: true }));

      // Validate field on blur
      const error = validateField(field);
      if (error) {
        setErrors((prev) => ({ ...prev, [field]: error }));
      } else {
        setErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
    },
    [validateField]
  );

  // Handle form submit
  const handleSubmit = useCallback(
    async (e?: FormEvent) => {
      if (e) {
        e.preventDefault();
      }

      setHasSubmitted(true);

      // Mark all fields as touched
      const allTouched = Object.keys(fields).reduce(
        (acc, key) => {
          acc[key as keyof TFormData] = true;
          return acc;
        },
        {} as Record<keyof TFormData, boolean>
      );
      setTouched(allTouched);

      // Validate form
      const isValid = validateForm();
      if (!isValid) {
        return;
      }

      setIsSubmitting(true);

      try {
        await onSubmit(values);
        onSuccess?.(values);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "An error occurred";
        onError?.(errorMessage);
      } finally {
        setIsSubmitting(false);
      }
    },
    [fields, values, validateForm, onSubmit, onSuccess, onError]
  );

  // Reset form
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
    setHasSubmitted(false);
  }, [initialValues]);

  // Set errors manually
  const setErrorsCallback = useCallback(
    (newErrors: Partial<Record<keyof TFormData, string>>) => {
      setErrors(newErrors);
    },
    []
  );

  // Clear all errors
  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  // Get field props
  const getFieldProps = useCallback(
    (field: keyof TFormData) => ({
      value: values[field],
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      name: String(field),
    }),
    [values, handleChange, handleBlur]
  );

  // Check if form is valid
  const isValid = Object.keys(errors).length === 0;

  return {
    values,
    errors,
    touched,
    isSubmitting,
    isValid,
    hasSubmitted,
    handleChange,
    setFieldValue,
    setValues: setValuesCallback,
    handleBlur,
    validateField,
    validateForm,
    handleSubmit,
    reset,
    setErrors: setErrorsCallback,
    clearErrors,
    getFieldProps,
  };
}

// ===========================================================================
// EXPORTS
// ===========================================================================

export default {
  useForm,
  validators,
};
