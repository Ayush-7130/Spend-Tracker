'use client';

import React from 'react';
import { BadgeProps } from './config';

export default function Badge({
  children,
  variant = 'secondary',
  size = 'md',
  className = '',
  outline = false,
}: BadgeProps) {
  const sizeClasses = {
    sm: 'badge-sm',
    md: '',
    lg: 'badge-lg'
  };

  const baseClass = outline ? `badge-outline-${variant}` : `bg-${variant}`;
  const sizeClass = sizeClasses[size];
  
  return (
    <span className={`badge ${baseClass} ${sizeClass} ${className}`}>
      {children}
    </span>
  );
}