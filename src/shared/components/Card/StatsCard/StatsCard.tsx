'use client';

import React from 'react';
import { StatsCardProps, defaultStatsCardConfig, iconVariantMap } from '../config';
import LoadingSpinner from '../../LoadingSpinner/LoadingSpinner';

export default function StatsCard({
  title,
  value,
  icon,
  variant = defaultStatsCardConfig.variant,
  trend,
  subtitle,
  footer,
  loading = false,
  className = '',
  size = defaultStatsCardConfig.size,
  onClick,
}: StatsCardProps) {
  
  const sizeClasses = {
    sm: 'p-3',
    md: 'p-4', 
    lg: 'p-5'
  };

  const cardClass = [
    'card',
    'h-100',
    onClick ? 'cursor-pointer' : '',
    className
  ].filter(Boolean).join(' ');

  const iconClass = iconVariantMap[variant];

  if (loading) {
    return (
      <div className={cardClass}>
        <div className={`card-body ${sizeClasses[size]} text-center`}>
          <LoadingSpinner config={{ 
            size: 'small', 
            showText: false, 
            variant: 'secondary',
            centered: true
          }} />
        </div>
      </div>
    );
  }

  return (
    <div className={cardClass} onClick={onClick}>
      <div className={`card-body ${sizeClasses[size]}`}>
        <div className="d-flex align-items-center justify-content-between">
          <div>
            <h6 className="card-title text-muted mb-2">{title}</h6>
            <h4 className="mb-0 fw-bold">{value}</h4>
            {subtitle && (
              <small className="text-muted">{subtitle}</small>
            )}
            {trend && (
              <div className="mt-2">
                <span className={`small ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
                  <i className={`bi ${trend.isPositive ? 'bi-arrow-up' : 'bi-arrow-down'} me-1`}></i>
                  {Math.abs(trend.value)}%
                  {trend.label && <span className="text-muted ms-1">{trend.label}</span>}
                </span>
              </div>
            )}
          </div>
          {icon && (
            <div className="ms-3">
              <i className={`${icon} ${iconClass} fs-2`}></i>
            </div>
          )}
        </div>
        {footer && (
          <div className="mt-3 pt-3 border-top">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}