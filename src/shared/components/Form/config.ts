import { ReactNode } from "react";

// Base form field types
export interface BaseFormFieldProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  helperText?: string;
  className?: string;
  id?: string;
}

// Input field configuration
export interface InputFieldProps extends BaseFormFieldProps {
  type: "text" | "number" | "email" | "password" | "url" | "tel";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | string;
  maxLength?: number;
  pattern?: string;
  autoComplete?: string;
}

// Select field configuration
export interface SelectFieldProps extends BaseFormFieldProps {
  options: Array<{
    label: string;
    value: any;
    disabled?: boolean;
  }>;
  placeholder?: string;
  multiple?: boolean;
}

// Textarea field configuration
export interface TextareaFieldProps extends BaseFormFieldProps {
  rows?: number;
  cols?: number;
  placeholder?: string;
  maxLength?: number;
  resize?: "none" | "vertical" | "horizontal" | "both";
}

// Date field configuration
export interface DateFieldProps extends BaseFormFieldProps {
  min?: string;
  max?: string;
  step?: number;
}

// Checkbox field configuration
export interface CheckboxFieldProps extends Omit<
  BaseFormFieldProps,
  "value" | "onChange"
> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "default" | "switch";
}

// Radio field configuration
export interface RadioFieldProps extends BaseFormFieldProps {
  options: Array<{
    label: string;
    value: any;
    disabled?: boolean;
  }>;
  inline?: boolean;
}

// Form group configuration
export interface FormGroupProps {
  children: ReactNode;
  title?: string;
  description?: string;
  className?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// Field wrapper configuration
export interface FieldWrapperProps {
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: ReactNode;
  className?: string;
  labelClassName?: string;
  id?: string;
}

export const fieldSizeClasses = {
  sm: "form-control-sm",
  md: "",
  lg: "form-control-lg",
} as const;

export const fieldVariantClasses = {
  default: "",
  filled: "form-control-filled",
  outlined: "form-control-outlined",
} as const;
