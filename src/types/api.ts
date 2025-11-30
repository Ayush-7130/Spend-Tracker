/**
 * Shared API Types
 *
 * Common types shared between client and server API calls.
 * Ensures type safety across the entire application.
 */

// ===========================================================================
// BASE TYPES
// ===========================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationMeta;
}

/**
 * Sort configuration
 */
export interface SortConfig {
  sortBy: string;
  sortOrder: "asc" | "desc";
}

/**
 * Filter parameters
 */
export interface FilterParams {
  search?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// ===========================================================================
// USER TYPES
// ===========================================================================

/**
 * User role
 */
export type UserRole = "user" | "admin";

/**
 * User object (safe for client)
 */
export interface User {
  _id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

/**
 * Login request body
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response data
 */
export interface LoginResponse {
  user: User;
  token: string;
}

/**
 * Signup request body
 */
export interface SignupRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/**
 * Signup response data
 */
export interface SignupResponse {
  user: User;
  accessToken: string;
  expiresAt: Date;
}

/**
 * Profile update request
 */
export interface ProfileUpdateRequest {
  name?: string;
  email?: string;
}

/**
 * Password change request
 */
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// ===========================================================================
// EXPENSE TYPES
// ===========================================================================

/**
 * Split detail for expenses
 */
export interface SplitDetail {
  type: "equal" | "manual";
  saketAmount: number;
  ayushAmount: number;
}

/**
 * Expense object
 */
export interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  paidBy: string;
  isSplit: boolean;
  splitDetails?: SplitDetail;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create expense request
 */
export interface CreateExpenseRequest {
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  isSplit: boolean;
  splitDetails?: {
    type: "equal" | "manual";
    saketAmount?: number;
    ayushAmount?: number;
  };
}

/**
 * Update expense request
 */
export interface UpdateExpenseRequest extends Partial<CreateExpenseRequest> {
  _id: string;
}

/**
 * Expense filters
 */
export interface ExpenseFilters extends FilterParams {
  category?: string;
  paidBy?: string;
}

/**
 * Expenses list response
 */
export interface ExpensesResponse {
  expenses: Expense[];
  pagination: PaginationMeta;
}

// ===========================================================================
// CATEGORY TYPES
// ===========================================================================

/**
 * Category object
 */
export interface Category {
  _id: string;
  name: string;
  icon?: string;
  color?: string;
  subcategories: string[];
  createdAt: string;
  updatedAt: string;
}

/**
 * Create category request
 */
export interface CreateCategoryRequest {
  name: string;
  icon?: string;
  color?: string;
  subcategories?: string[];
}

/**
 * Update category request
 */
export interface UpdateCategoryRequest extends Partial<CreateCategoryRequest> {
  _id: string;
}

// ===========================================================================
// SETTLEMENT TYPES
// ===========================================================================

/**
 * Settlement status
 */
export type SettlementStatus = "borrow" | "settled";

/**
 * Settlement object
 */
export interface Settlement {
  _id: string;
  expenseId?: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: string;
  status: SettlementStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * Create settlement request
 */
export interface CreateSettlementRequest {
  expenseId?: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: string;
  status?: SettlementStatus;
}

/**
 * Update settlement request
 */
export interface UpdateSettlementRequest extends Partial<CreateSettlementRequest> {
  _id: string;
}

/**
 * Balance between users
 */
export interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
  status: "owes" | "settled";
}

/**
 * Balance summary
 */
export interface BalanceSummary {
  totalOwed: number;
  totalSettled: number;
  totalTransactions: number;
  activeBalances: number;
}

/**
 * Balance response
 */
export interface BalanceResponse {
  balances: Balance[];
  summary: BalanceSummary;
}

/**
 * Settlement filters
 */
export interface SettlementFilters extends FilterParams {
  user?: string;
  status?: SettlementStatus;
}

/**
 * Settlements list response
 */
export interface SettlementsResponse {
  settlements: Settlement[];
  pagination: PaginationMeta;
}

// ===========================================================================
// DASHBOARD TYPES
// ===========================================================================

/**
 * Dashboard statistics
 */
export interface DashboardStats {
  totalExpenses: number;
  monthlyExpenses: number;
  userBalance: number;
  recentExpenses: Expense[];
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
}

// ===========================================================================
// ANALYTICS TYPES
// ===========================================================================

/**
 * Analytics time range
 */
export type TimeRange = "week" | "month" | "quarter" | "year" | "custom";

/**
 * Spending trend data point
 */
export interface TrendDataPoint {
  date: string;
  amount: number;
  count: number;
}

/**
 * Category spending data
 */
export interface CategorySpending {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * User spending data
 */
export interface UserSpending {
  user: string;
  amount: number;
  count: number;
  percentage: number;
}

/**
 * Analytics overview
 */
export interface AnalyticsOverview {
  totalSpending: number;
  averagePerDay: number;
  transactionCount: number;
  trends: TrendDataPoint[];
  categoryBreakdown: CategorySpending[];
  userBreakdown: UserSpending[];
}

/**
 * Analytics filters
 */
export interface AnalyticsFilters {
  timeRange: TimeRange;
  startDate?: string;
  endDate?: string;
  category?: string;
  user?: string;
}

// ===========================================================================
// NOTIFICATION TYPES
// ===========================================================================

/**
 * Notification type
 */
export type NotificationType = "info" | "success" | "warning" | "error";

/**
 * Notification object
 */
export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

/**
 * Create notification request
 */
export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
}

// ===========================================================================
// ERROR TYPES
// ===========================================================================

/**
 * API error
 */
export interface ApiError {
  error: string;
  errors?: Record<string, string>;
  status: number;
}

/**
 * Validation error
 */
export interface ValidationError {
  field: string;
  message: string;
}

// ===========================================================================
// EXPORT TYPES
// ===========================================================================

/**
 * Export format
 */
export type ExportFormat = "csv" | "excel" | "json" | "pdf";

/**
 * Export request
 */
export interface ExportRequest {
  format: ExportFormat;
  filters?: Record<string, any>;
  columns?: string[];
}

// ===========================================================================
// TYPE GUARDS
// ===========================================================================

/**
 * Check if response is successful
 */
export function isSuccessResponse<T>(
  response: ApiResponse<T>
): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

/**
 * Check if response is error
 */
export function isErrorResponse(
  response: ApiResponse
): response is ApiResponse & { success: false; error: string } {
  return response.success === false && response.error !== undefined;
}

/**
 * Check if user is admin
 */
export function isAdmin(user: User): boolean {
  return user.role === "admin";
}

// ===========================================================================
// UTILITY TYPES
// ===========================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make specific properties required
 */
export type RequireFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Omit multiple properties
 */
export type OmitMultiple<T, K extends keyof T> = Omit<T, K>;

/**
 * Pick multiple properties
 */
export type PickMultiple<T, K extends keyof T> = Pick<T, K>;
