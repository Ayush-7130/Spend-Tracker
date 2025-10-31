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
    this.name = 'ApiError';
  }
}

// Base API configuration
const API_BASE_URL = '/api';

// HTTP methods enum
export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH'
}

// Base fetch wrapper with error handling
export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, {
      ...defaultOptions,
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.message || `HTTP error! status: ${response.status}`,
        response.status,
        errorData
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    // Handle network errors or JSON parsing errors
    throw new ApiError(
      error instanceof Error ? error.message : 'An unknown error occurred'
    );
  }
}

// Helper functions for different HTTP methods
export const api = {
  get: <T = any>(endpoint: string, params?: Record<string, any>): Promise<T> => {
    const searchParams = params ? `?${new URLSearchParams(params)}` : '';
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
    if (error instanceof ApiError && error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
      throw error;
    }
    
    if (retries > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
      return withRetry(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}