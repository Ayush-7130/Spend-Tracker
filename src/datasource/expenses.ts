import { api, withRetry } from './base';

// Expense-related types
export interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  paidBy: string;
  isSplit?: boolean;
  categoryName?: string;
  subcategory?: string;
  splitBetween?: string[];
  saketAmount?: number;
  ayushAmount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateExpenseData {
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  isSplit?: boolean;
  splitBetween?: string[];
  saketAmount?: number;
  ayushAmount?: number;
}

export interface UpdateExpenseData extends Partial<CreateExpenseData> {
  _id: string;
}

export interface ExpenseFilters {
  user?: 'all' | 'saket' | 'ayush';
  category?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'description';
  sortOrder?: 'asc' | 'desc';
}

export interface ExpenseListResponse {
  expenses: Expense[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Expenses Datasource
export class ExpensesDataSource {
  /**
   * Get all expenses with optional filtering
   */
  static async getExpenses(filters?: ExpenseFilters): Promise<ExpenseListResponse> {
    return withRetry(() => api.get<ExpenseListResponse>('/expenses', filters));
  }

  /**
   * Get a specific expense by ID
   */
  static async getExpenseById(id: string): Promise<Expense> {
    return withRetry(() => api.get<Expense>(`/expenses/${id}`));
  }

  /**
   * Create a new expense
   */
  static async createExpense(expenseData: CreateExpenseData): Promise<Expense> {
    return withRetry(() => api.post<Expense>('/expenses', expenseData));
  }

  /**
   * Update an existing expense
   */
  static async updateExpense(id: string, expenseData: UpdateExpenseData): Promise<Expense> {
    return withRetry(() => api.put<Expense>(`/expenses/${id}`, expenseData));
  }

  /**
   * Delete an expense
   */
  static async deleteExpense(id: string): Promise<{ success: boolean; message: string }> {
    return withRetry(() => api.delete<{ success: boolean; message: string }>(`/expenses/${id}`));
  }

  /**
   * Get recent expenses (for dashboard)
   */
  static async getRecentExpenses(limit: number = 5): Promise<Expense[]> {
    return withRetry(() => 
      api.get<Expense[]>('/expenses', { 
        limit, 
        sortBy: 'date', 
        sortOrder: 'desc' 
      })
    );
  }

  /**
   * Get expense summary/statistics
   */
  static async getExpenseSummary(filters?: Omit<ExpenseFilters, 'page' | 'limit'>): Promise<{
    totalAmount: number;
    totalCount: number;
    averageAmount: number;
    monthlyTotal: number;
    monthlyCount: number;
  }> {
    return withRetry(() => api.get('/expenses/summary', filters));
  }

  /**
   * Bulk delete expenses
   */
  static async bulkDeleteExpenses(ids: string[]): Promise<{ 
    success: boolean; 
    deleted: number; 
    failed: string[] 
  }> {
    return withRetry(() => api.post('/expenses/bulk-delete', { ids }));
  }

  /**
   * Duplicate an expense
   */
  static async duplicateExpense(id: string, modifications?: Partial<CreateExpenseData>): Promise<Expense> {
    return withRetry(() => api.post(`/expenses/${id}/duplicate`, modifications));
  }

  /**
   * Get expenses by category
   */
  static async getExpensesByCategory(categoryId: string, filters?: Omit<ExpenseFilters, 'category'>): Promise<ExpenseListResponse> {
    return withRetry(() => 
      api.get<ExpenseListResponse>('/expenses', { 
        ...filters, 
        category: categoryId 
      })
    );
  }

  /**
   * Get expenses by user
   */
  static async getExpensesByUser(user: 'saket' | 'ayush', filters?: Omit<ExpenseFilters, 'user'>): Promise<ExpenseListResponse> {
    return withRetry(() => 
      api.get<ExpenseListResponse>('/expenses', { 
        ...filters, 
        user 
      })
    );
  }

  /**
   * Get expense trends over time
   */
  static async getExpenseTrends(period: 'week' | 'month' | 'year' = 'month', filters?: ExpenseFilters): Promise<{
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      backgroundColor?: string;
      borderColor?: string;
    }>;
  }> {
    return withRetry(() => 
      api.get(`/expenses/trends`, { 
        ...filters,
        period 
      })
    );
  }
}

export default ExpensesDataSource;