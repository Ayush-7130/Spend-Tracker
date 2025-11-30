/**
 * Token Refresh Hook
 * Proactively refreshes access tokens BEFORE they expire
 *
 * Features:
 * - Automatic refresh 2 minutes before token expiry (13 min for 15 min tokens, 5 days 22 hours for 7 day tokens)
 * - Calculates interval based on actual token expiry from cookie/JWT
 * - Skips refresh on public pages (login, signup, etc.)
 * - Handles refresh failures gracefully without immediate logout
 * - Refreshes on visibility change (when user returns to tab)
 * - Cleans up interval and listeners on unmount
 *
 * Usage:
 * - Add to MainLayout or any authenticated component
 * - Runs automatically in the background
 */

"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";

// Parse JWT to get expiry time
function parseJWT(token: string): { exp?: number } | null {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
}

// Get access token from cookies
function getAccessToken(): string | null {
  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "accessToken") {
      return value;
    }
  }
  return null;
}

// Calculate when to refresh (2 minutes before expiry)
function calculateRefreshInterval(): number {
  const token = getAccessToken();
  if (!token) {
    return 13 * 60 * 1000; // Default to 13 minutes
  }

  const payload = parseJWT(token);
  if (!payload?.exp) {
    return 13 * 60 * 1000; // Default to 13 minutes
  }

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = payload.exp - now;

  // Refresh 2 minutes (120 seconds) before expiry
  const refreshIn = Math.max(expiresIn - 120, 60); // At least 60 seconds

  return refreshIn * 1000; // Convert to milliseconds
}

export function useTokenRefresh() {
  const router = useRouter();
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Skip on public pages
    const publicPaths = ["/login", "/signup", "/register", "/auth"];
    if (publicPaths.some((path) => pathname?.startsWith(path))) {
      // Clean up if we navigate to a public page
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityListenerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          visibilityListenerRef.current
        );
        visibilityListenerRef.current = null;
      }
      return;
    }

    const refresh = async () => {
      try {
        // Check if we have any cookies before attempting refresh
        const hasCookies =
          document.cookie.includes("accessToken") ||
          document.cookie.includes("refreshToken");

        if (!hasCookies) {
          return;
        }

        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Only redirect on authentication errors, not server errors
          if (response.status === 401 || response.status === 403) {
            // Clear interval before redirecting
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            router.push("/login");
          }
          // For other errors (500, 503, etc.), don't logout - will retry on next interval
        } else {
          // Recalculate and reset the interval with new token expiry
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          const newInterval = calculateRefreshInterval();
          intervalRef.current = setInterval(refresh, newInterval);
        }
      } catch (error) {
        // Network errors are temporary, don't logout
      }
    };

    // Set up initial interval based on token expiry
    const initialInterval = calculateRefreshInterval();
    intervalRef.current = setInterval(refresh, initialInterval);

    // Set up visibility change listener to refresh when user returns
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if token is close to expiry (within 2 minutes)
        const token = getAccessToken();
        if (token) {
          const payload = parseJWT(token);
          if (payload?.exp) {
            const now = Math.floor(Date.now() / 1000);
            const expiresIn = payload.exp - now;

            // If token expires in less than 2 minutes, refresh immediately
            if (expiresIn < 120) {
              refresh();
            }
          }
        }
      }
    };

    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityListenerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          visibilityListenerRef.current
        );
        visibilityListenerRef.current = null;
      }
    };
  }, [pathname, router]);
}

/**
 * Advanced Token Refresh Hook with explicit token lifetime
 * Use this if you know the exact token lifetime from server config
 * For most cases, use the default useTokenRefresh() hook which auto-detects
 *
 * @param tokenLifetime - Token lifetime in minutes (15 for normal, 10080 for 7-day remember me)
 */
export function useTokenRefreshAdvanced(tokenLifetime: number = 15) {
  const router = useRouter();
  const pathname = usePathname();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const visibilityListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Skip on public pages
    const publicPaths = ["/login", "/signup", "/register", "/auth"];
    if (publicPaths.some((path) => pathname?.startsWith(path))) {
      // Clean up if we navigate to a public page
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityListenerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          visibilityListenerRef.current
        );
        visibilityListenerRef.current = null;
      }
      return;
    }

    // Calculate refresh interval (refresh 2 minutes before expiry)
    const refreshInterval = Math.max((tokenLifetime - 2) * 60 * 1000, 60000); // At least 1 minute

    const refresh = async () => {
      try {
        // Check if we have any cookies before attempting refresh
        const hasCookies =
          document.cookie.includes("accessToken") ||
          document.cookie.includes("refreshToken");

        if (!hasCookies) {
          return;
        }

        const response = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          // Only redirect on authentication errors
          if (response.status === 401 || response.status === 403) {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            router.push("/login");
          }
          // For server errors, don't logout
        }
      } catch (error) {
        // Network errors are temporary, don't logout
      }
    };

    // Set up interval for proactive refresh
    intervalRef.current = setInterval(refresh, refreshInterval);

    // Set up visibility change listener
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // For simplicity, just trigger a refresh when tab becomes visible
        refresh();
      }
    };

    visibilityListenerRef.current = handleVisibilityChange;
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (visibilityListenerRef.current) {
        document.removeEventListener(
          "visibilitychange",
          visibilityListenerRef.current
        );
        visibilityListenerRef.current = null;
      }
    };
  }, [pathname, tokenLifetime, router]);
}
