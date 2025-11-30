// Base API response type
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// API Error class for better error handling
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public response?: any
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// Base API configuration
const API_BASE_URL = "/api";

// HTTP methods enum
export enum HttpMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
}

// Track if we're currently refreshing to prevent race conditions
let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Refresh access token using refresh token
 * Prevents multiple simultaneous refresh calls
 */
async function refreshAccessToken(): Promise<boolean> {
  // If already refreshing, wait for that to complete
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: "POST",
        credentials: "include", // CRITICAL: Include cookies
        headers: {
          "Content-Type": "application/json",
        },
      });

      return response.ok;
    } catch (error) {
      console.error("Error refreshing access token:", error);
      return false;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Base fetch wrapper with error handling and token refresh
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const defaultOptions: RequestInit = {
    credentials: "include", // CRITICAL: Always include cookies for auth
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    let response = await fetch(url, mergedOptions);

    // Handle 401 - Token expired
    if (response.status === 401) {
      // Check if we have cookies before attempting refresh
      const hasCookies =
        typeof document !== "undefined" &&
        (document.cookie.includes("accessToken") ||
          document.cookie.includes("refreshToken"));

      if (!hasCookies) {
        // Public routes that should not redirect to login
        const publicRoutes = [
          "/login",
          "/signup",
          "/auth/forgot-password",
          "/auth/reset-password",
          "/auth/verify-email",
        ];

        const isPublicRoute = publicRoutes.some((route) =>
          window.location.pathname.startsWith(route)
        );

        // Redirect to login if not already on a public route
        if (typeof window !== "undefined" && !isPublicRoute) {
          window.location.href = "/login";
        }

        throw new ApiError("Authentication required", 401);
      }

      // Don't try to refresh on these endpoints to prevent loops
      const noRefreshEndpoints = [
        "/auth/refresh",
        "/auth/login",
        "/auth/signup",
      ];

      // For /auth/me, only skip refresh if we're on the login page
      // This allows the initial auth check to fail gracefully
      if (endpoint === "/auth/me") {
        if (
          typeof window !== "undefined" &&
          window.location.pathname.startsWith("/login")
        ) {
          throw new ApiError("Authentication required", 401);
        }
      }

      if (noRefreshEndpoints.some((e) => endpoint.includes(e))) {
        throw new ApiError("Authentication required", 401);
      }

      const refreshed = await refreshAccessToken();

      if (refreshed) {
        // Retry the original request with new token
        response = await fetch(url, mergedOptions);
      } else {
        // Refresh failed - redirect to login only if we're in the browser and not already on login
        if (
          typeof window !== "undefined" &&
          !window.location.pathname.startsWith("/login")
        ) {
          window.location.href = "/login";
        }
        throw new ApiError("Session expired. Please login again.", 401);
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const apiError = new ApiError(
        errorData.message ||
          errorData.error ||
          `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
      console.error(
        `API request failed [${response.status}]:`,
        endpoint,
        apiError.message
      );
      throw apiError;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    // Handle network errors or JSON parsing errors
    console.error("API request error:", endpoint, error);
    throw new ApiError(
      error instanceof Error ? error.message : "An unknown error occurred"
    );
  }
}

// Helper functions for different HTTP methods
export const api = {
  get: <T = any>(
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> => {
    const searchParams = params ? `?${new URLSearchParams(params)}` : "";
    return apiRequest<T>(`${endpoint}${searchParams}`, {
      method: HttpMethod.GET,
    });
  },

  post: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.POST,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  put: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.PUT,
      body: data ? JSON.stringify(data) : undefined,
    });
  },

  delete: <T = any>(endpoint: string): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.DELETE,
    });
  },

  patch: <T = any>(endpoint: string, data?: any): Promise<T> => {
    return apiRequest<T>(endpoint, {
      method: HttpMethod.PATCH,
      body: data ? JSON.stringify(data) : undefined,
    });
  },
};

// Request retry utility
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Don't retry on client errors (4xx) - these are usually auth or validation issues
    if (
      error instanceof ApiError &&
      error.statusCode &&
      error.statusCode >= 400 &&
      error.statusCode < 500
    ) {
      throw error;
    }

    if (retries > 0) {
      if (process.env.NODE_ENV === "development") {
        console.warn(`Retrying request (${retries} attempts remaining)...`);
      }
      await new Promise((resolve) => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    console.error("Request failed after all retry attempts:", error);
    throw error;
  }
}
