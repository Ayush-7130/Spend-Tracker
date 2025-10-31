import { api, withRetry } from './base';

// Settlement-related types
export interface Settlement {
  _id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  relatedExpenses?: string[]; // Array of expense IDs
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSettlementData {
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date?: string;
  relatedExpenses?: string[];
}

export interface UpdateSettlementData extends Partial<CreateSettlementData> {
  _id: string;
  status?: 'pending' | 'completed' | 'cancelled';
}

export interface BalanceInfo {
  fromUser: string;
  toUser: string;
  amount: number;
  status: 'owes' | 'settled';
}

export interface SettlementSummary {
  totalOwed: number;
  totalSettled: number;
  totalTransactions: number;
  activeBalances: number;
  balances: BalanceInfo[];
}

export interface SettlementFilters {
  user?: string;
  status?: 'pending' | 'completed' | 'cancelled' | 'all';
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'amount' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface SettlementListResponse {
  settlements: Settlement[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Settlements Datasource
export class SettlementsDataSource {
  /**
   * Get all settlements with optional filtering
   */
  static async getSettlements(filters?: SettlementFilters): Promise<SettlementListResponse> {
    return withRetry(() => api.get<SettlementListResponse>('/settlements', filters));
  }

  /**
   * Get a specific settlement by ID
   */
  static async getSettlementById(id: string): Promise<Settlement> {
    return withRetry(() => api.get<Settlement>(`/settlements/${id}`));
  }

  /**
   * Create a new settlement
   */
  static async createSettlement(settlementData: CreateSettlementData): Promise<Settlement> {
    return withRetry(() => api.post<Settlement>('/settlements', settlementData));
  }

  /**
   * Update an existing settlement
   */
  static async updateSettlement(id: string, settlementData: UpdateSettlementData): Promise<Settlement> {
    return withRetry(() => api.put<Settlement>(`/settlements/${id}`, settlementData));
  }

  /**
   * Delete a settlement
   */
  static async deleteSettlement(id: string): Promise<{ success: boolean; message: string }> {
    return withRetry(() => api.delete<{ success: boolean; message: string }>(`/settlements/${id}`));
  }

  /**
   * Get balance information between users
   */
  static async getBalances(): Promise<SettlementSummary> {
    return withRetry(() => api.get<SettlementSummary>('/settlements/balance'));
  }

  /**
   * Get balance information for a specific user
   */
  static async getUserBalance(username: string): Promise<{
    owes: Array<{ toUser: string; amount: number }>;
    owedBy: Array<{ fromUser: string; amount: number }>;
    netBalance: number;
  }> {
    return withRetry(() => api.get(`/settlements/balance/${username}`));
  }

  /**
   * Mark a settlement as completed
   */
  static async completeSettlement(id: string): Promise<Settlement> {
    return withRetry(() => api.patch<Settlement>(`/settlements/${id}/complete`));
  }

  /**
   * Mark a settlement as cancelled
   */
  static async cancelSettlement(id: string, reason?: string): Promise<Settlement> {
    return withRetry(() => 
      api.patch<Settlement>(`/settlements/${id}/cancel`, { reason })
    );
  }

  /**
   * Get recent settlements (for dashboard)
   */
  static async getRecentSettlements(limit: number = 5): Promise<Settlement[]> {
    return withRetry(() => 
      api.get<Settlement[]>('/settlements', { 
        limit, 
        sortBy: 'date', 
        sortOrder: 'desc' 
      })
    );
  }

  /**
   * Auto-calculate settlement suggestions based on expenses
   */
  static async getSettlementSuggestions(): Promise<Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    relatedExpenses: string[];
    description: string;
  }>> {
    return withRetry(() => api.get('/settlements/suggestions'));
  }

  /**
   * Create settlements from suggestions
   */
  static async createFromSuggestions(suggestions: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    relatedExpenses: string[];
    description?: string;
  }>): Promise<Settlement[]> {
    return withRetry(() => 
      api.post<Settlement[]>('/settlements/create-from-suggestions', { suggestions })
    );
  }

  /**
   * Get settlement history/timeline
   */
  static async getSettlementHistory(filters?: {
    user?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Array<{
    date: string;
    settlements: Settlement[];
    totalAmount: number;
  }>> {
    return withRetry(() => api.get('/settlements/history', filters));
  }

  /**
   * Bulk operations on settlements
   */
  static async bulkUpdateSettlements(
    ids: string[], 
    updates: { status?: Settlement['status']; description?: string }
  ): Promise<{
    updated: number;
    failed: string[];
  }> {
    return withRetry(() => 
      api.patch('/settlements/bulk-update', { ids, updates })
    );
  }

  /**
   * Get settlement statistics
   */
  static async getSettlementStats(timeframe?: 'week' | 'month' | 'year' | 'all'): Promise<{
    totalSettlements: number;
    completedSettlements: number;
    pendingSettlements: number;
    cancelledSettlements: number;
    totalAmount: number;
    averageAmount: number;
    completionRate: number;
  }> {
    return withRetry(() => 
      api.get('/settlements/stats', { timeframe: timeframe || 'all' })
    );
  }

  /**
   * Export settlements to CSV/JSON
   */
  static async exportSettlements(
    format: 'csv' | 'json' = 'json',
    filters?: SettlementFilters
  ): Promise<{ data: Settlement[]; filename: string }> {
    return withRetry(() => 
      api.get('/settlements/export', { ...filters, format })
    );
  }

  /**
   * Get optimal settlement plan (minimize number of transactions)
   */
  static async getOptimalSettlementPlan(): Promise<Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    description: string;
  }>> {
    return withRetry(() => api.get('/settlements/optimal-plan'));
  }
}

export default SettlementsDataSource;