import { api, withRetry } from './base';
import { AnalyticsOverview } from './analytics';
import { Settlement } from './settlements';

// Dashboard-specific data aggregation
export interface DashboardData extends AnalyticsOverview {
  recentSettlements: Settlement[];
  quickStats: {
    todayExpenses: number;
    weekExpenses: number;
    monthExpenses: number;
    avgDailyExpense: number;
  };
  alerts: Array<{
    id: string;
    type: 'budget' | 'settlement' | 'category' | 'general';
    severity: 'low' | 'medium' | 'high';
    message: string;
    actionRequired: boolean;
    createdAt: string;
  }>;
}

// Dashboard Datasource
export class DashboardDataSource {
  /**
   * Get complete dashboard data
   */
  static async getDashboardData(user?: 'all' | 'saket' | 'ayush'): Promise<DashboardData> {
    return withRetry(() => 
      api.get<DashboardData>('/dashboard', { user: user || 'all' })
    );
  }

  /**
   * Get quick statistics for dashboard cards
   */
  static async getQuickStats(user?: 'all' | 'saket' | 'ayush'): Promise<DashboardData['quickStats']> {
    return withRetry(() => 
      api.get<DashboardData['quickStats']>('/dashboard/quick-stats', { user: user || 'all' })
    );
  }

  /**
   * Get user alerts and notifications
   */
  static async getAlerts(): Promise<DashboardData['alerts']> {
    return withRetry(() => 
      api.get<DashboardData['alerts']>('/dashboard/alerts')
    );
  }

  /**
   * Dismiss an alert
   */
  static async dismissAlert(alertId: string): Promise<{ success: boolean }> {
    return withRetry(() => 
      api.delete<{ success: boolean }>(`/dashboard/alerts/${alertId}`)
    );
  }

  /**
   * Get dashboard widgets configuration
   */
  static async getWidgetConfig(): Promise<Array<{
    id: string;
    type: 'chart' | 'stat' | 'table' | 'alert';
    title: string;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    visible: boolean;
    config: Record<string, any>;
  }>> {
    return withRetry(() => 
      api.get('/dashboard/widgets')
    );
  }

  /**
   * Update dashboard widgets configuration
   */
  static async updateWidgetConfig(config: Array<{
    id: string;
    type: 'chart' | 'stat' | 'table' | 'alert';
    title: string;
    size: 'small' | 'medium' | 'large';
    position: { x: number; y: number };
    visible: boolean;
    config: Record<string, any>;
  }>): Promise<{ success: boolean }> {
    return withRetry(() => 
      api.put('/dashboard/widgets', { widgets: config })
    );
  }
}

export default DashboardDataSource;