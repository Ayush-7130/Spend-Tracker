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
  refreshToken: () => Promise<boolean>;
  isAuthenticated: boolean;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component with optimized re-render prevention
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Track in-flight refresh promises to prevent race conditions
  const refreshPromiseRef = useRef<Promise<boolean> | null>(null);

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

  // Auto-refresh access token every 14 minutes (1 minute before expiry)
  useEffect(() => {
    // Only run auto-refresh when user is logged in
    if (!user) return;

    const refreshInterval = setInterval(
      async () => {
        // Don't run auto-refresh if we're logging out
        if (loggingOutRef.current) {
          return;
        }
        try {
          const refreshResponse = await fetch("/api/auth/refresh", {
            method: "POST",
            credentials: "include", // Important: send HTTP-only cookies
          });

          if (!refreshResponse.ok) {
            // Differentiate between auth errors and other errors
            if (
              refreshResponse.status === 401 ||
              refreshResponse.status === 403
            ) {
              // Genuine authentication error - logout user (only if not already logging out)
              if (!loggingOutRef.current) {
                await logout();
              }
            }
            // Server error (5xx) or other temporary issue - don't logout
            // Token refresh will be retried on next interval
            return;
          }

          // CRITICAL: Verify the new token by fetching user data
          // This ensures the new token is valid and updates the auth state
          const meResponse = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "include",
            headers: {
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
          });

          if (!meResponse.ok) {
            // Only logout on auth errors, not server errors
            if (meResponse.status === 401 || meResponse.status === 403) {
              if (!loggingOutRef.current) {
                await logout();
              }
            }
            return;
          }

          const userData = await meResponse.json();

          if (userData.success && userData.data?.user) {
            setUser(userData.data.user);
          } else {
            if (!loggingOutRef.current) {
              await logout();
            }
          }
        } catch (error) {
          // Network error or fetch failure - don't logout immediately
          // Could be temporary connection issue
          // Token refresh will be retried on next interval
          console.error("[AuthContext] Auto-refresh error:", error);
        }
      },
      14 * 60 * 1000
    ); // 14 minutes (840,000ms)

    // Cleanup interval on unmount or when user changes
    return () => {
      clearInterval(refreshInterval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]); // Re-run when user state changes (logout is stable)

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

  /**
   * Manual token refresh function with race condition prevention
   * Can be called before making critical API calls
   * Returns true if refresh succeeded, false otherwise
   *
   * IMPORTANT: Uses a promise reference to prevent multiple concurrent refresh attempts
   */
  const refreshToken = useCallback(async (): Promise<boolean> => {
    // If a refresh is already in progress, return that promise
    // This prevents race conditions when multiple API calls trigger refresh simultaneously
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    // Create new refresh promise and store it
    const refreshPromise = (async () => {
      try {
        // Step 1: Refresh the token
        const refreshResponse = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
        });

        if (!refreshResponse.ok) {
          // Differentiate between auth errors and network/server errors
          if (
            refreshResponse.status === 401 ||
            refreshResponse.status === 403
          ) {
            // Genuine auth error - logout
            await logout();
            return false;
          }

          // Server error or temporary issue - don't logout
          return false;
        }

        // Step 2: Verify the new token by fetching user data
        const meResponse = await fetch("/api/auth/me", {
          method: "GET",
          credentials: "include",
          headers: {
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });

        if (!meResponse.ok) {
          // Only logout on auth errors
          if (meResponse.status === 401 || meResponse.status === 403) {
            await logout();
          }
          return false;
        }

        const userData = await meResponse.json();

        if (userData.success && userData.data?.user) {
          setUser(userData.data.user);
          return true;
        }

        return false;
      } catch {
        // Network error - don't logout, could be temporary
        return false;
      } finally {
        // Clear the promise reference when done
        refreshPromiseRef.current = null;
      }
    })();

    // Store the promise to prevent concurrent refreshes
    refreshPromiseRef.current = refreshPromise;

    return refreshPromise;
  }, [logout]);

  // Memoize the context value to prevent unnecessary re-renders
  const value: AuthContextType = useMemo(
    () => ({
      user,
      loading,
      login,
      signup,
      logout,
      refreshUser,
      refreshToken,
      isAuthenticated: !!user,
    }),
    [user, loading, login, signup, logout, refreshUser, refreshToken]
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
