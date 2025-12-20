"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { AuthDataSource, User } from "@/datasource/auth";
import { LoadingSpinner } from "@/shared/components";

// Authentication context interface
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (
    email: string,
    password: string,
    rememberMe?: boolean,
    mfaToken?: string
  ) => Promise<{ success: boolean; error?: string; requiresMfa?: boolean }>;
  signup: (
    name: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isAuthenticated: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component with optimized re-render prevention
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Track if we're in the middle of logging out to prevent redirect loops
  const loggingOutRef = useRef(false);

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
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Memoize callback functions to prevent unnecessary re-renders
  const login = useCallback(
    async (
      email: string,
      password: string,
      rememberMe: boolean = false,
      mfaToken?: string
    ) => {
      try {
        setLoading(true);

        const response = await AuthDataSource.login({
          email,
          password,
          rememberMe,
          mfaToken,
        });

        // Check if MFA is required
        if (response.requiresMfa) {
          return { success: false, requiresMfa: true };
        }

        if (response.user) {
          setUser(response.user);
          return { success: true };
        } else {
          return { success: false, error: "Login failed - no user returned" };
        }
      } catch (error: any) {
        return { success: false, error: error.message || "Login failed" };
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signup = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      confirmPassword: string
    ) => {
      try {
        setLoading(true);

        const response = await AuthDataSource.signup({
          name,
          email,
          password,
          confirmPassword,
        });

        if (response.user) {
          // After successful signup, automatically log the user in
          const loginResult = await login(email, password);
          return loginResult;
        } else {
          return { success: false, error: "Signup failed - no user returned" };
        }
      } catch (error: any) {
        return { success: false, error: error.message || "Signup failed" };
      } finally {
        setLoading(false);
      }
    },
    [login]
  );

  const logout = useCallback(async () => {
    // Prevent multiple simultaneous logout attempts
    if (loggingOutRef.current) {
      return;
    }

    loggingOutRef.current = true;

    try {
      await AuthDataSource.logout();
    } catch (error) {
      // Continue with logout even if API fails
      console.error("[Logout] API call failed:", error);
    } finally {
      // Clear user state
      setUser(null);

      // Only redirect if we're not already on the login page
      if (
        typeof window !== "undefined" &&
        !window.location.pathname.startsWith("/login")
      ) {
        // Force a full page reload to clear any cached state
        window.location.href = "/login";
      } else {
        // Reset the flag if we're already on login page
        loggingOutRef.current = false;
      }
    }
  }, []);

  const refreshUser = useCallback(async () => {
    await checkAuthStatus();
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      isAuthenticated: !!user,
    }),
    [user, loading, login, signup, logout, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
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
              size: "medium",
              variant: "primary",
              showText: true,
              text: "Authenticating...",
            }}
          />
        </div>
      );
    }

    if (!isAuthenticated) {
      // Redirect to login page
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
      return null;
    }

    return <Component {...props} />;
  };
}
