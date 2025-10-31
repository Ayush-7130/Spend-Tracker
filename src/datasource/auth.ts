import { api, withRetry, ApiResponse } from './base';

// User interface
export interface User {
  _id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  createdAt: string;
  updatedAt: string;
}

// Authentication request/response types
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export interface SignupResponse {
  user: User;
}

// Authentication Datasource
export class AuthDataSource {
  /**
   * Login user
   */
  static async login(credentials: LoginRequest): Promise<LoginResponse> {
    const response = await withRetry(() => api.post<ApiResponse<LoginResponse>>('/auth/login', credentials));
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Login failed');
  }

  /**
   * Sign up new user
   */
  static async signup(userData: SignupRequest): Promise<SignupResponse> {
    const response = await withRetry(() => api.post<ApiResponse<SignupResponse>>('/auth/signup', userData));
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Signup failed');
  }

  /**
   * Logout user
   */
  static async logout(): Promise<{ success: boolean; message: string }> {
    const response = await withRetry(() => api.post<ApiResponse<{ success: boolean; message: string }>>('/auth/logout'));
    if (response.success) {
      return { success: true, message: response.message || 'Logged out successfully' };
    }
    throw new Error(response.error || 'Logout failed');
  }

  /**
   * Get current user
   */
  static async getCurrentUser(): Promise<User> {
    // Don't use retry for auth checks as 401 errors are expected when not authenticated
    const response = await api.get<ApiResponse<{ user: User }>>('/auth/me');
    if (response.success && response.data) {
      return response.data.user;
    }
    throw new Error(response.error || 'Failed to get user');
  }
}

// Notifications interface
export interface Notification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  entityId?: string;
  entityType?: string;
  createdAt: string;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  unreadCount: number;
}

// Notifications Datasource
export class NotificationsDataSource {
  /**
   * Get user notifications
   */
  static async getNotifications(page: number = 1, limit: number = 20): Promise<NotificationsResponse> {
    const response = await withRetry(() => api.get<ApiResponse<NotificationsResponse>>('/notifications', { page, limit }));
    if (response.success && response.data) {
      return response.data;
    }
    throw new Error(response.error || 'Failed to get notifications');
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<{ success: boolean; message: string }> {
    const response = await withRetry(() => api.patch<ApiResponse<{ success: boolean; message: string }>>('/notifications', { 
      notificationId, 
      markAsRead: true,
      setTTL: true
    }));
    if (response.success) {
      return { success: true, message: response.message || 'Marked as read' };
    }
    throw new Error(response.error || 'Failed to mark as read');
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(): Promise<{ success: boolean; message: string }> {
    const response = await withRetry(() => api.patch<ApiResponse<{ success: boolean; message: string }>>('/notifications', { 
      markAllAsRead: true,
      setTTL: true
    }));
    if (response.success) {
      return { success: true, message: response.message || 'All marked as read' };
    }
    throw new Error(response.error || 'Failed to mark all as read');
  }
}