'use client';

import { LoadingSpinnerConfig } from './config';

interface LoadingSpinnerProps {
  config?: LoadingSpinnerConfig;
  className?: string;
}

export default function LoadingSpinner({ config, className = '' }: LoadingSpinnerProps) {
  const {
    size = 'medium',
    variant = 'primary',
    text = 'Loading...',
    showText = true,
    centered = true,
    overlay = false,
    className: configClassName = '',
  } = config || {};

  const sizeClasses = {
    small: 'spinner-sm',
    medium: 'spinner-md', 
    large: 'spinner-lg',
  };

  const sizeContainerClasses = {
    small: 'loading-small',
    medium: 'loading-medium',
    large: 'loading-large',
  };

  const variantClasses = {
    primary: 'spinner-primary',
    secondary: 'spinner-secondary',
    light: 'spinner-light',
    dark: 'spinner-dark',
  };

  const spinnerClasses = [
    'loading-spinner',
    sizeClasses[size],
    variantClasses[variant],
    centered ? 'spinner-centered' : '',
    overlay ? 'spinner-overlay' : '',
  ].filter(Boolean).join(' ');

  const containerClasses = [
    'loading-container',
    sizeContainerClasses[size],
    centered ? 'loading-centered' : '',
    overlay ? 'loading-overlay' : '',
    configClassName,
    className,
  ].filter(Boolean).join(' ');

  if (overlay) {
    return (
      <div className={containerClasses}>
        <div className="loading-backdrop" />
        <div className="loading-content">
          <div className={spinnerClasses} />
          {showText && text && <p className="loading-text">{text}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className={containerClasses}>
      <div className={spinnerClasses} />
      {showText && text && <p className="loading-text">{text}</p>}
    </div>
  );
}