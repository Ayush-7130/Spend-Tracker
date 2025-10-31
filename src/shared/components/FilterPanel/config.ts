import { ReactNode } from 'react';

// Filter types
export interface FilterOption {
  label: string;
  value: string | number;
}

export interface FilterConfig {
  key: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  label: string;
  placeholder?: string;
  options?: FilterOption[];
  colSize?: 1 | 2 | 3 | 4 | 6 | 12;
  disabled?: boolean;
  required?: boolean;
}

export interface FilterPanelProps {
  filters: FilterConfig[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
  loading?: boolean;
  className?: string;
  title?: string;
  clearButtonText?: string;
  clearButtonVariant?: 'primary' | 'secondary' | 'outline-primary' | 'outline-secondary';
  children?: ReactNode;
}

export const defaultFilterConfig = {
  colSize: 2 as const,
  clearButtonText: 'Clear',
  clearButtonVariant: 'outline-secondary' as const,
};