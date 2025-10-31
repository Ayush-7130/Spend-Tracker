'use client';

import React from 'react';
import { UserBadgeProps, userConfig } from './config';

export default function UserBadge({
  user,
  variant = 'default',
  showName = true,
  className = '',
}: UserBadgeProps) {
  const config = userConfig[user];

  if (variant === 'avatar') {
    return (
      <div className={`d-flex align-items-center ${className}`}>
        <div
          className={`avatar-xs bg-${config.color} text-white rounded-circle d-flex align-items-center justify-content-center me-2`}
          style={{
            width: '24px',
            height: '24px',
            fontSize: '10px',
          }}
        >
          {config.avatar}
        </div>
        {showName && (
          <span>{config.name}</span>
        )}
      </div>
    );
  }

  const sizeClass = variant === 'small' ? 'badge' : 'badge';
  
  return (
    <span className={`${sizeClass} bg-${config.color} ${className}`}>
      {config.name}
    </span>
  );
}