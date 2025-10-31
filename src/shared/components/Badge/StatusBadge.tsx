'use client';

import React from 'react';
import { StatusBadgeProps, statusTypeConfig } from './config';

export default function StatusBadge({
  status,
  type,
  variant = 'default',
  className = '',
  color,
}: StatusBadgeProps) {
  
  // Determine color based on type and status
  const getColor = () => {
    if (color) return color;
    
    switch (type) {
      case 'user':
        return statusTypeConfig.user[status as keyof typeof statusTypeConfig.user] || 'secondary';
      case 'split':
        return statusTypeConfig.split[status as keyof typeof statusTypeConfig.split] || 'secondary';
      case 'settlement':
        return statusTypeConfig.settlement[status as keyof typeof statusTypeConfig.settlement] || 'secondary';
      case 'category':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  // Format status text
  const getStatusText = () => {
    switch (type) {
      case 'split':
        return status === 'split' ? 'Split' : 'Personal';
      case 'settlement':
        return status.charAt(0).toUpperCase() + status.slice(1);
      case 'user':
        return status.charAt(0).toUpperCase() + status.slice(1);
      default:
        return status;
    }
  };

  const badgeColor = getColor();
  const sizeClass = variant === 'small' ? 'badge-sm' : '';
  const textClass = badgeColor === 'light' ? 'text-dark' : '';
  
  return (
    <span className={`badge bg-${badgeColor} ${sizeClass} ${textClass} ${className}`}>
      {getStatusText()}
    </span>
  );
}