'use client';

import React from 'react';
import { EmptyStateConfig } from './config';

export interface EmptyStateProps extends EmptyStateConfig {
  className?: string;
  style?: React.CSSProperties;
}

export default function EmptyState({
  icon: _icon = '📋',
  title = 'No data available',
  description = 'There is no data to display at this time.',
  actions = [],
  size = 'medium',
  variant: _variant = 'default',
  className = '',
  centered = true,
  showBorder = false,
  style,
}: EmptyStateProps) {
  const sizeClasses = {
    small: 'py-6 px-4',
    medium: 'py-12 px-6',
    large: 'py-16 px-8'
  };

  // Variant classes and icon sizes are defined but not currently used in the component
  // Kept for future styling enhancements
  const _variantClasses = {
    default: 'text-gray-500',
    error: 'text-red-500',
    search: 'text-blue-500',
    filter: 'text-orange-500'
  };

  const _iconSizes = {
    small: 'text-2xl mb-2',
    medium: 'text-4xl mb-4',
    large: 'text-6xl mb-6'
  };

  const titleSizes = {
    small: 'text-lg font-medium',
    medium: 'text-xl font-semibold',
    large: 'text-2xl font-bold'
  };

  const descSizes = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };

  return (
    <div
      className={`
        ${sizeClasses[size]}
        ${centered ? 'text-center' : ''}
        ${showBorder ? 'border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50' : ''}
        ${className}
      `}
      style={style}
    >
      {/* Title */}
      <h3 className={`${titleSizes[size]} empty-state-title mb-2`}>
        {title}
      </h3>

      {/* Description */}
      <p className={`${descSizes[size]} empty-state-description mb-6`}>
        {description}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div className="empty-state-actions">
          {actions.map((action, index) => {
            return (
              <button
                key={index}
                onClick={action.onClick}
                className={`empty-state-action-btn ${action.variant === 'outline' ? 'empty-state-btn-outline' : action.variant === 'secondary' ? 'empty-state-btn-secondary' : 'empty-state-btn-primary'}`}
              >
                {action.icon && (
                  <span className="empty-state-btn-icon" aria-hidden="true">
                    {action.icon === 'plus' ? '➕' : action.icon}
                  </span>
                )}
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}