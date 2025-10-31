'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { AuthDataSource, User } from '@/datasource/auth';
import { LoadingSpinner } from '@/shared/components';

// Authentication context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string, confirmPassword: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const user = await AuthDataSource.getCurrentUser();
      setUser(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      console.log('No authenticated user');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    try {
      setLoading(true);
      console.log('Starting login process...');
      
      const response = await AuthDataSource.login({
        email,
        password,
        rememberMe
      });

      console.log('Login response:', response);

      if (response.user) {
        console.log('Login successful, setting user...');
        setUser(response.user);
        return { success: true };
      } else {
        console.error('No user in login response');
        return { success: false, error: 'Login failed - no user returned' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      return { success: false, error: error.message || 'Login failed' };
    } finally {
      setLoading(false);
    }
  };

  const signup = async (name: string, email: string, password: string, confirmPassword: string) => {
    try {
      setLoading(true);
      console.log('Starting signup process...');
      
      const response = await AuthDataSource.signup({
        name,
        email,
        password,
        confirmPassword
      });

      console.log('Signup response:', response);

      if (response.user) {
        console.log('Signup successful, attempting auto-login...');
        // After successful signup, automatically log the user in
        const loginResult = await login(email, password);
        console.log('Auto-login result:', loginResult);
        return loginResult;
      } else {
        console.error('No user in signup response');
        return { success: false, error: 'Signup failed - no user returned' };
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      return { success: false, error: error.message || 'Signup failed' };
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await AuthDataSource.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      // Redirect to login page or home
      window.location.href = '/login';
    }
  };

  const refreshUser = async () => {
    await checkAuthStatus();
  };

  const value: AuthContextType = {
    user,
    loading,
    login,
    signup,
    logout,
    refreshUser,
    isAuthenticated: !!user
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, loading } = useAuth();

    if (loading) {
      return (
        <div className="d-flex justify-content-center align-items-center min-vh-100">
          <LoadingSpinner 
            config={{ 
              size: 'medium',
              variant: 'primary',
              showText: true,
              text: 'Authenticating...'
            }}
          />
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login page
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      return null;
    }

    return <Component {...props} />;
  };
}