/**
 * Dashboard Index
 * This file orchestrates the dashboard configuration, datasource, and translations
 */

import { DashboardDataSource, type DashboardData } from '@/datasource/dashboard';
import { ExpensesDataSource } from '@/datasource/expenses';
import { SettlementsDataSource } from '@/datasource/settlements';
import { AnalyticsDataSource } from '@/datasource/analytics';
import { DefaultConfigs, type DashboardConfig } from '@/config/pages';
import { TranslationService, t, formatCurrency, formatDate } from '@/translations';

export class DashboardManager {
  /**
   * Get configured dashboard layout
   */
  static getDashboardConfig(): DashboardConfig {
    const baseConfig = DefaultConfigs.dashboard();
    
    // Customize based on user selection
    const userSpecificSections = baseConfig.sections.map(section => ({
      ...section,
      title: t(`dashboard.sections.${section.id}.title`) || section.title,
    }));

    return {
      ...baseConfig,
      sections: userSpecificSections,
    };
  }

  /**
   * Load complete dashboard data
   */
  static async loadDashboardData(user: 'all' | 'saket' | 'ayush' = 'all'): Promise<{
    success: boolean;
    data?: {
      overview: DashboardData;
      quickStats: {
        todayExpenses: number;
        weekExpenses: number;
        monthExpenses: number;
        avgDailyExpense: number;
      };
      recentExpenses: any[];
      recentSettlements: any[];
      categoryBreakdown: Array<{ category: string; amount: number; percentage: number; color: string }>;
      spendingTrend: Array<{ date: string; amount: number }>;
      alerts: any[];
    };
    error?: string;
  }> {
    try {
      // Load all required data in parallel
      const [
        dashboardData,
        quickStats,
        recentExpenses,
        recentSettlements,
        categoryBreakdown,
        timelineData,
        alerts
      ] = await Promise.all([
        DashboardDataSource.getDashboardData(user),
        DashboardDataSource.getQuickStats(user),
        ExpensesDataSource.getRecentExpenses(5),
        SettlementsDataSource.getRecentSettlements(5),
        AnalyticsDataSource.getCategoryBreakdown({ user }),
        AnalyticsDataSource.getTimelineData('week', { user }),
        DashboardDataSource.getAlerts(),
      ]);

      // Process category breakdown with colors
      const categoryColors = [
        '#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
        '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
      ];

      const processedCategoryBreakdown = categoryBreakdown.labels.map((label, index) => ({
        category: label,
        amount: categoryBreakdown.data[index],
        percentage: categoryBreakdown.total > 0 
          ? (categoryBreakdown.data[index] / categoryBreakdown.total) * 100 
          : 0,
        color: categoryColors[index % categoryColors.length],
      }));

      // Process spending trend
      const spendingTrend = timelineData.map(item => ({
        date: formatDate(item.date, 'short'),
        amount: item.total,
      }));

      return {
        success: true,
        data: {
          overview: dashboardData,
          quickStats,
          recentExpenses: recentExpenses.map(expense => ({
            ...expense,
            formattedAmount: formatCurrency(expense.amount),
            formattedDate: formatDate(expense.date),
          })),
          recentSettlements: recentSettlements.map(settlement => ({
            ...settlement,
            formattedAmount: formatCurrency(settlement.amount),
            formattedDate: formatDate(settlement.date),
            statusLabel: t(`status.settlement.${settlement.status}.label`),
            statusColor: TranslationService.getStatusConfig(`settlement.${settlement.status}`).color,
          })),
          categoryBreakdown: processedCategoryBreakdown,
          spendingTrend,
          alerts: alerts.map(alert => ({
            ...alert,
            typeLabel: t(`alerts.${alert.type}.label`) || alert.type,
            severityLabel: t(`alerts.severity.${alert.severity}.label`) || alert.severity,
          })),
        },
      };
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      return {
        success: false,
        error: t('messages.dashboard.loading'),
      };
    }
  }

  /**
   * Get dashboard cards configuration
   */
  static getCardsConfig() {
    return {
      quickStats: [
        {
          id: 'today-expenses',
          title: t('dashboard.cards.todayExpenses.title'),
          icon: 'calendar',
          color: 'primary',
          formatter: (value: number) => formatCurrency(value),
        },
        {
          id: 'week-expenses',
          title: t('dashboard.cards.weekExpenses.title'),
          icon: 'trend-up',
          color: 'success',
          formatter: (value: number) => formatCurrency(value),
        },
        {
          id: 'month-expenses',
          title: t('dashboard.cards.monthExpenses.title'),
          icon: 'calendar-month',
          color: 'info',
          formatter: (value: number) => formatCurrency(value),
        },
        {
          id: 'avg-daily',
          title: t('dashboard.cards.avgDaily.title'),
          icon: 'chart-bar',
          color: 'warning',
          formatter: (value: number) => formatCurrency(value),
        },
      ],
      overview: [
        {
          id: 'total-expenses',
          title: t('dashboard.cards.totalExpenses.title'),
          icon: 'money',
          color: 'primary',
          formatter: (value: number) => formatCurrency(value),
        },
        {
          id: 'total-count',
          title: t('dashboard.cards.totalCount.title'),
          icon: 'list',
          color: 'secondary',
          formatter: (value: number) => value.toString(),
        },
        {
          id: 'categories',
          title: t('dashboard.cards.categories.title'),
          icon: 'category',
          color: 'info',
          formatter: (value: number) => value.toString(),
        },
        {
          id: 'settlement-amount',
          title: t('dashboard.cards.settlementAmount.title'),
          icon: 'balance',
          color: 'warning',
          formatter: (value: number) => formatCurrency(value),
        },
      ],
    };
  }

  /**
   * Get chart configurations for dashboard
   */
  static getChartsConfig() {
    return {
      spendingTrend: {
        type: 'line',
        title: t('dashboard.charts.spendingTrend.title'),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
            tooltip: {
              callbacks: {
                label: (context: any) => formatCurrency(context.parsed.y),
              },
            },
          },
          scales: {
            x: {
              title: {
                display: true,
                text: t('dashboard.charts.spendingTrend.xAxis'),
              },
            },
            y: {
              title: {
                display: true,
                text: t('dashboard.charts.spendingTrend.yAxis'),
              },
              ticks: {
                callback: (value: any) => formatCurrency(value),
              },
            },
          },
        },
      },
      categoryBreakdown: {
        type: 'doughnut',
        title: t('dashboard.charts.categoryBreakdown.title'),
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'right',
            },
            tooltip: {
              callbacks: {
                label: (context: any) => {
                  const label = context.label || '';
                  const value = formatCurrency(context.parsed);
                  const percentage = ((context.parsed / context.dataset.data.reduce((a: number, b: number) => a + b, 0)) * 100).toFixed(1);
                  return `${label}: ${value} (${percentage}%)`;
                },
              },
            },
          },
        },
      },
    };
  }

  /**
   * Process alerts for display
   */
  static processAlerts(alerts: Array<{
    id: string;
    type: 'budget' | 'settlement' | 'category' | 'general';
    severity: 'low' | 'medium' | 'high';
    message: string;
    actionRequired: boolean;
    createdAt: string;
  }>): Array<{
    id: string;
    type: 'budget' | 'settlement' | 'category' | 'general';
    severity: 'low' | 'medium' | 'high';
    title: string;
    message: string;
    actionRequired: boolean;
    createdAt: string;
    formattedDate: string;
    icon: string;
    color: string;
  }> {
    const alertIcons = {
      budget: 'wallet',
      settlement: 'balance-scale',
      category: 'tag',
      general: 'info-circle',
    };

    const severityColors = {
      low: 'info',
      medium: 'warning',
      high: 'danger',
    };

    return alerts.map(alert => ({
      ...alert,
      title: t(`alerts.${alert.type}.${alert.severity}.title`) || alert.message,
      formattedDate: formatDate(alert.createdAt),
      icon: alertIcons[alert.type as keyof typeof alertIcons] || 'info-circle',
      color: severityColors[alert.severity as keyof typeof severityColors] || 'info',
    }));
  }

  /**
   * Get filter options for dashboard
   */
  static getFilterOptions() {
    return {
      users: TranslationService.getSelectOptions('users'),
      timePeriods: [
        { label: t('filters.timePeriod.today'), value: 'today' },
        { label: t('filters.timePeriod.week'), value: 'week' },
        { label: t('filters.timePeriod.month'), value: 'month' },
        { label: t('filters.timePeriod.year'), value: 'year' },
      ],
    };
  }

  /**
   * Export dashboard data
   */
  static async exportDashboardData(
    user: 'all' | 'saket' | 'ayush' = 'all',
    format: 'pdf' | 'json' | 'csv' = 'pdf'
  ): Promise<{ success: boolean; data?: string; filename?: string }> {
    try {
      const dashboardData = await this.loadDashboardData(user);
      
      if (!dashboardData.success || !dashboardData.data) {
        return { success: false };
      }

      const { exportUtils } = await import('@/lib/utils/enhanced');
      
      if (format === 'json') {
        const exportData = [{
          generatedAt: new Date().toISOString(),
          user,
          ...(typeof dashboardData.data === 'object' && dashboardData.data !== null ? dashboardData.data : {}),
        }];
        const jsonData = exportUtils.toJSON(exportData, true);
        const filename = exportUtils.generateFilename(`dashboard_${user}`, 'json');
        return { success: true, data: jsonData, filename };
      }
      
      // For CSV, export the most important data
      if (format === 'csv') {
        const csvData = exportUtils.toCSV([
          { metric: 'Today Expenses', value: dashboardData.data.quickStats.todayExpenses },
          { metric: 'Week Expenses', value: dashboardData.data.quickStats.weekExpenses },
          { metric: 'Month Expenses', value: dashboardData.data.quickStats.monthExpenses },
          { metric: 'Average Daily', value: dashboardData.data.quickStats.avgDailyExpense },
        ]);
        const filename = exportUtils.generateFilename(`dashboard_summary_${user}`, 'csv');
        return { success: true, data: csvData, filename };
      }

      // PDF export would need a PDF library
      return { success: false };
    } catch (error) {
      console.error('Failed to export dashboard data:', error);
      return { success: false };
    }
  }

  /**
   * Dismiss alert
   */
  static async dismissAlert(alertId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await DashboardDataSource.dismissAlert(alertId);
      return { success: result.success, message: t('dashboard.alert.dismissed') };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { success: false, message: t('dashboard.alert.dismissFailed') };
    }
  }

  /**
   * Calculate dashboard insights
   */
  static calculateInsights(data: any): Array<{
    type: 'info' | 'warning' | 'success' | 'danger';
    title: string;
    message: string;
    actionable: boolean;
  }> {
    const insights = [];

    // Spending pattern analysis
    if (data.quickStats.todayExpenses > data.quickStats.avgDailyExpense * 2) {
      const messageTemplate = t('insights.highSpending.message');
      const message = messageTemplate
        .replace('{today}', formatCurrency(data.quickStats.todayExpenses))
        .replace('{average}', formatCurrency(data.quickStats.avgDailyExpense));
      
      insights.push({
        type: 'warning' as const,
        title: t('insights.highSpending.title'),
        message,
        actionable: true,
      });
    }

    // Category concentration
    if (data.categoryBreakdown.length > 0) {
      const topCategory = data.categoryBreakdown[0];
      if (topCategory.percentage > 60) {
        const messageTemplate = t('insights.categoryConcentration.message');
        const message = messageTemplate
          .replace('{category}', topCategory.category)
          .replace('{percentage}', topCategory.percentage.toFixed(1));
        
        insights.push({
          type: 'info' as const,
          title: t('insights.categoryConcentration.title'),
          message,
          actionable: false,
        });
      }
    }

    // Settlement recommendations
    if (data.recentSettlements.length === 0) {
      insights.push({
        type: 'info' as const,
        title: t('insights.noSettlements.title'),
        message: t('insights.noSettlements.message'),
        actionable: true,
      });
    }

    return insights;
  }
}

export default DashboardManager;