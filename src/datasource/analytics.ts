import { api, withRetry } from "./base";

// Analytics-related types
export interface AnalyticsOverview {
  totalExpenses: number;
  totalExpenseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  categoriesCount: number;
  settlementAmount: number;
  settlementMessage: string;
  users: Array<{
    id: string;
    name: string;
    totalExpenses: number;
    expenseCount: number;
  }>;
  recentExpenses: Array<{
    _id: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paidBy: string;
    isSplit?: boolean;
    categoryName?: string;
  }>;
}

export interface TimelineData {
  date: string;
  total: number;
  count: number;
  categories: Array<{
    name: string;
    amount: number;
    count: number;
    color?: string;
  }>;
}

export interface CategoryTrend {
  category: string;
  data: Array<{
    period: string;
    amount: number;
    count: number;
  }>;
}

export interface UserAnalytics {
  username: string;
  totalSpent: number;
  expenseCount: number;
  averageExpense: number;
  topCategories: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    amount: number;
    count: number;
  }>;
  splitVsPersonalRatio: {
    personal: number;
    split: number;
  };
}

export interface ComparisonData {
  users: Array<{
    name: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
  labels: string[];
  summary: {
    totalByUser: Record<string, number>;
    averageByUser: Record<string, number>;
    topSpender: string;
    mostEconomical: string;
  };
}

export interface AdvancedFilters {
  user?: "all" | "saket" | "ayush";
  startDate?: string;
  endDate?: string;
  categories?: string[];
  amountRange?: {
    min: number;
    max: number;
  };
  includeSettlements?: boolean;
  groupBy?: "day" | "week" | "month" | "year";
}

// Analytics Datasource
export class AnalyticsDataSource {
  /**
   * Get dashboard overview data
   */
  static async getDashboardOverview(
    user?: "all" | "saket" | "ayush"
  ): Promise<AnalyticsOverview> {
    return withRetry(() =>
      api.get<AnalyticsOverview>("/analytics/overview", { user: user || "all" })
    );
  }

  /**
   * Get timeline/trend data for charts
   */
  static async getTimelineData(
    period: "week" | "month" | "year" = "month",
    filters?: AdvancedFilters
  ): Promise<TimelineData[]> {
    return withRetry(() =>
      api.get<TimelineData[]>("/analytics/timeline", {
        period,
        ...filters,
      })
    );
  }

  /**
   * Get category-wise trends over time
   */
  static async getCategoryTrends(
    period: "week" | "month" | "year" = "month",
    filters?: AdvancedFilters
  ): Promise<CategoryTrend[]> {
    return withRetry(() =>
      api.get<CategoryTrend[]>("/analytics/trends", {
        period,
        ...filters,
      })
    );
  }

  /**
   * Get detailed user analytics
   */
  static async getUserAnalytics(
    username: "saket" | "ayush",
    timeframe?: "week" | "month" | "year" | "all"
  ): Promise<UserAnalytics> {
    return withRetry(() =>
      api.get<UserAnalytics>(`/analytics/user/${username}`, {
        timeframe: timeframe || "all",
      })
    );
  }

  /**
   * Get user comparison data
   */
  static async getUserComparison(
    metric: "spending" | "categories" | "frequency" = "spending",
    period: "week" | "month" | "year" = "month"
  ): Promise<ComparisonData> {
    return withRetry(() =>
      api.get<ComparisonData>("/analytics/comparison", { metric, period })
    );
  }

  /**
   * Get category breakdown (pie chart data)
   */
  static async getCategoryBreakdown(filters?: AdvancedFilters): Promise<{
    labels: string[];
    data: number[];
    backgroundColor: string[];
    total: number;
  }> {
    return withRetry(() => api.get("/analytics/categories", filters));
  }

  /**
   * Get spending patterns and insights
   */
  static async getSpendingPatterns(filters?: AdvancedFilters): Promise<{
    dailyAverage: number;
    weeklyAverage: number;
    monthlyAverage: number;
    mostExpensiveDay: { day: string; amount: number };
    mostExpensiveCategory: { category: string; amount: number };
    spendingStreak: { current: number; longest: number };
    budgetInsights: {
      recommendedBudget: number;
      savingsPotential: number;
      categoryRecommendations: Array<{
        category: string;
        currentSpending: number;
        recommendedSpending: number;
        reason: string;
      }>;
    };
  }> {
    return withRetry(() => api.get("/analytics/patterns", filters));
  }

  /**
   * Get monthly summary report
   */
  static async getMonthlySummary(
    month?: string, // Format: YYYY-MM
    year?: number
  ): Promise<{
    month: string;
    totalExpenses: number;
    expenseCount: number;
    averageExpense: number;
    topCategories: Array<{
      category: string;
      amount: number;
      percentage: number;
    }>;
    userBreakdown: Record<string, { amount: number; count: number }>;
    weeklyBreakdown: Array<{ week: string; amount: number; count: number }>;
    goals: {
      budgetGoal?: number;
      actualSpending: number;
      variance: number;
      status: "under" | "over" | "on-track";
    };
  }> {
    return withRetry(() => api.get("/analytics/summary", { month, year }));
  }

  /**
   * Get expense forecasting data
   */
  static async getExpenseForecast(
    months: number = 3,
    method: "linear" | "seasonal" | "trend" = "trend"
  ): Promise<{
    forecast: Array<{
      period: string;
      predicted: number;
      confidence: number;
      range: { min: number; max: number };
    }>;
    accuracy: number;
    methodology: string;
    recommendations: string[];
  }> {
    return withRetry(() => api.get("/analytics/forecast", { months, method }));
  }

  /**
   * Get budget analysis and recommendations
   */
  static async getBudgetAnalysis(budgetAmount?: number): Promise<{
    currentMonthSpending: number;
    projectedMonthlySpending: number;
    budgetStatus: "under" | "over" | "on-track";
    remainingBudget: number;
    daysRemaining: number;
    dailyBudgetRemaining: number;
    recommendations: Array<{
      type: "warning" | "suggestion" | "congratulation";
      message: string;
      category?: string;
      amount?: number;
    }>;
    categoryBudgets: Array<{
      category: string;
      suggested: number;
      current: number;
      status: "under" | "over" | "on-track";
    }>;
  }> {
    return withRetry(() => api.get("/analytics/budget", { budgetAmount }));
  }

  /**
   * Get advanced analytics with custom queries
   */
  static async getAdvancedAnalytics(query: {
    metrics: string[];
    dimensions: string[];
    filters?: AdvancedFilters;
    aggregation?: "sum" | "avg" | "count" | "min" | "max";
  }): Promise<any> {
    return withRetry(() => api.post("/analytics/advanced", query));
  }

  /**
   * Export analytics data
   */
  static async exportAnalytics(
    format: "csv" | "json" | "pdf" = "json",
    reportType: "summary" | "detailed" | "charts" = "summary",
    filters?: AdvancedFilters
  ): Promise<{ data: any; filename: string; url?: string }> {
    return withRetry(() =>
      api.get("/analytics/export", { format, reportType, ...filters })
    );
  }
}

export default AnalyticsDataSource;
