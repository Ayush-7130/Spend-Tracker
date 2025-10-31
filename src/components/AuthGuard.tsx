'use client';

import { useAuth } from '@/contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { LoadingSpinner } from '@/shared/components';

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, loading } = useAuth();
  const pathname = usePathname();
  const [isMounted, setIsMounted] = useState(false);

  // Public routes that don't require authentication
  const publicRoutes = ['/login']; // '/signup' removed - disabled
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    
    // Redirect unauthenticated users to login (except on public routes)
    if (!loading && !isAuthenticated && !isPublicRoute) {
      window.location.href = '/login';
    }
    
    // Redirect authenticated users away from login/signup pages
    if (!loading && isAuthenticated && isPublicRoute) {
      window.location.href = '/';
    }
  }, [isAuthenticated, loading, isPublicRoute, isMounted]);

  // Prevent hydration mismatch by not rendering anything during SSR
  if (!isMounted) {
    return null;
  }

  // Show loading during authentication check
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <LoadingSpinner 
          config={{
            size: 'large',
            variant: 'primary',
            showText: true,
            text: 'Loading Spend Tracker...',
            overlay: true
          }}
        />
      </div>
    );
  }

  // Show public routes without authentication check
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Show protected content only if authenticated
  if (isAuthenticated) {
    return <>{children}</>;
  }

  // This will rarely show as the useEffect handles redirection
  return (
    <div className="d-flex justify-content-center align-items-center min-vh-100">
      <LoadingSpinner 
        config={{
          size: 'large',
          variant: 'primary',
          showText: true,
          text: 'Redirecting to login...',
          overlay: true
        }}
      />
    </div>
  );
}