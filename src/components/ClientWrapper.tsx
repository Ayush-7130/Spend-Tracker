'use client';

import React from 'react';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { CategoriesProvider } from '@/contexts/CategoriesContext';
import AuthGuard from './AuthGuard';

interface ClientWrapperProps {
  children: React.ReactNode;
}

export const ClientWrapper: React.FC<ClientWrapperProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <NotificationProvider>
        <AuthProvider>
          <AuthGuard>
            <CategoriesProvider>
              {children}
            </CategoriesProvider>
          </AuthGuard>
        </AuthProvider>
      </NotificationProvider>
    </ThemeProvider>
  );
};