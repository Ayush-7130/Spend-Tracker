import { ReactNode } from 'react';

// Card configuration types
export interface CardAction {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
  loading?: boolean;
  className?: string;
}

// StatsCard configuration types
export interface StatsCardProps {
  title: string;
  value: string | number;
  icon?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark';
  trend?: {
    value: number;
    isPositive?: boolean;
    label?: string;
  };
  subtitle?: string;
  footer?: ReactNode;
  loading?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

export const defaultStatsCardConfig = {
  variant: 'primary' as const,
  size: 'md' as const,
};

export const iconVariantMap = {
  primary: 'text-primary',
  secondary: 'text-secondary', 
  success: 'text-success',
  danger: 'text-danger',
  warning: 'text-warning',
  info: 'text-info',
  light: 'text-muted',
  dark: 'text-dark',
} as const;

export interface CardConfig {
  // Content
  title?: string;
  subtitle?: string;
  description?: string;
  content?: any; // Can be React node
  
  // Header
  headerActions?: CardAction[];
  headerIcon?: string;
  headerImage?: string;
  
  // Footer
  footerActions?: CardAction[];
  footerContent?: any; // Can be React node
  
  // Visual options
  variant?: 'default' | 'outlined' | 'elevated' | 'filled';
  size?: 'small' | 'medium' | 'large';
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  
  // Layout
  horizontal?: boolean;
  centered?: boolean;
  fullWidth?: boolean;
  
  // Interaction
  clickable?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
  
  // Loading and states
  loading?: boolean;
  disabled?: boolean;
  error?: boolean;
  errorMessage?: string;
  
  // Styling
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  footerClassName?: string;
  
  // Media
  image?: {
    src: string;
    alt: string;
    position?: 'top' | 'left' | 'right' | 'bottom';
    aspectRatio?: string;
  };
  
  // Badge/chip
  badge?: {
    text: string;
    variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
    position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  };
  
  // Progress/status
  progress?: {
    value: number;
    max: number;
    label?: string;
    color?: string;
  };
  
  // Statistics
  stats?: Array<{
    label: string;
    value: string | number;
    icon?: string;
    change?: {
      value: number;
      type: 'increase' | 'decrease';
      period?: string;
    };
  }>;
  
  // Quick actions (FAB-style)
  quickActions?: Array<{
    icon: string;
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary' | 'danger' | 'warning' | 'success';
  }>;
  
  // Expandable content
  expandable?: boolean;
  expanded?: boolean;
  onExpandToggle?: (expanded: boolean) => void;
  expandedContent?: any;
  
  // Drag and drop
  draggable?: boolean;
  onDragStart?: (e: DragEvent) => void;
  onDragEnd?: (e: DragEvent) => void;
  
  // Selection
  selectable?: boolean;
  selected?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

// Predefined card configurations
export const DefaultCardConfigs = {
  // Basic info card
  info: (title: string, content: any): CardConfig => ({
    title,
    content,
    variant: 'outlined',
    size: 'medium',
    hoverable: true,
  }),

  // Statistic card
  stat: (title: string, value: string | number, icon?: string): CardConfig => ({
    title,
    content: value,
    headerIcon: icon,
    variant: 'filled',
    size: 'small',
    centered: true,
    color: 'primary',
  }),

  // Action card with buttons
  action: (title: string, description: string, actions: CardAction[]): CardConfig => ({
    title,
    description,
    footerActions: actions,
    variant: 'elevated',
    size: 'medium',
  }),

  // Media card with image
  media: (title: string, description: string, imageSrc: string, imageAlt: string): CardConfig => ({
    title,
    description,
    image: {
      src: imageSrc,
      alt: imageAlt,
      position: 'top',
    },
    variant: 'outlined',
    size: 'medium',
  }),

  // Dashboard widget card
  widget: (title: string, stats: CardConfig['stats']): CardConfig => ({
    title,
    stats,
    variant: 'filled',
    size: 'medium',
    hoverable: true,
  }),

  // Progress card
  progress: (title: string, progress: CardConfig['progress']): CardConfig => ({
    title,
    progress,
    variant: 'outlined',
    size: 'medium',
  }),

  // Expandable card
  expandable: (title: string, content: any, expandedContent: any): CardConfig => ({
    title,
    content,
    expandable: true,
    expandedContent,
    variant: 'outlined',
    size: 'medium',
  }),

  // Alert/notification card
  alert: (title: string, message: string, type: 'success' | 'warning' | 'danger' | 'info'): CardConfig => ({
    title,
    description: message,
    color: type,
    variant: 'filled',
    size: 'medium',
  }),

  // Feature card for landing pages
  feature: (title: string, description: string, icon: string, actions?: CardAction[]): CardConfig => ({
    title,
    description,
    headerIcon: icon,
    footerActions: actions,
    variant: 'outlined',
    size: 'large',
    centered: true,
  }),

  // Profile/user card
  profile: (name: string, subtitle: string, imageSrc?: string): CardConfig => ({
    title: name,
    subtitle,
    image: imageSrc ? {
      src: imageSrc,
      alt: `${name} profile`,
      position: 'left',
    } : undefined,
    horizontal: true,
    variant: 'outlined',
    size: 'medium',
  }),
};