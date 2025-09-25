'use client';

import React from 'react';
import { NotificationProvider } from '@/contexts/NotificationContext';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  return (
    <NotificationProvider>
      {children}
    </NotificationProvider>
  );
};