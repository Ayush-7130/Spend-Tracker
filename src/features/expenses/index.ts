/**
 * Expense Management Index
 * This file orchestrates the configuration, datasource, and translation for expense management
 */

import { ExpensesDataSource, type Expense, type CreateExpenseData, type UpdateExpenseData, type ExpenseFilters } from '@/datasource/expenses';
import { CategoriesDataSource, type Category } from '@/datasource/categories';
import { DefaultConfigs, type ExpenseTableConfig } from '@/config/pages';
import { TranslationService, t, formatCurrency, formatDate } from '@/translations';
import { dateUtils, validationUtils, dataUtils } from '@/lib/utils/enhanced';

// Enhanced expense table configuration with translations
export class ExpenseManager {
  private static categories: Category[] = [];
  
  /**
   * Initialize expense manager with categories
   */
  static async init(): Promise<void> {
    try {
      this.categories = await CategoriesDataSource.getCategories();
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  }

  /**
   * Get configured expense table
   */
  static getTableConfig(overrides?: Partial<ExpenseTableConfig>): ExpenseTableConfig {
    const baseConfig = DefaultConfigs.expenseTable();
    
    // Update category filter options
    const categoryOptions = this.categories.map(cat => ({
      label: cat.name,
      value: cat._id,
    }));

    // Apply translations to columns
    const translatedColumns = baseConfig.columns.map(column => ({
      ...column,
      header: TranslationService.getTableConfig(column.key).header || column.header,
      render: column.render || TranslationService.getTableConfig(column.key).formatter,
    }));

    // Apply translations to filters
    const translatedFilters = baseConfig.filters?.map(filter => ({
      ...filter,
      label: t(`forms.${filter.key}.label`) || filter.label,
      placeholder: t(`forms.${filter.key}.placeholder`) || filter.placeholder,
      options: filter.key === 'category' ? categoryOptions : filter.options,
    }));

    // Apply translations to actions
    const translatedActions = baseConfig.actions?.map(action => ({
      ...action,
      label: t(`actions.expense.${action.label.toLowerCase()}`) || action.label,
    }));

    const translatedBulkActions = baseConfig.bulkActions?.map(action => ({
      ...action,
      label: t(`actions.expense.${action.label.toLowerCase().replace(' ', '')}`) || action.label,
    }));

    return {
      ...baseConfig,
      ...overrides,
      columns: translatedColumns,
      filters: translatedFilters,
      actions: translatedActions,
      bulkActions: translatedBulkActions,
    };
  }

  /**
   * Load expenses with filtering and processing
   */
  static async loadExpenses(filters?: ExpenseFilters): Promise<{
    expenses: Expense[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      totalAmount: number;
      averageAmount: number;
      categoryBreakdown: Array<{ category: string; amount: number; count: number }>;
    };
  }> {
    try {
      const response = await ExpensesDataSource.getExpenses(filters);
      
      // Calculate summary statistics
      const amounts = response.expenses.map(e => e.amount);
      const stats = dataUtils.statistics(amounts);
      
      // Group by category for breakdown
      const categoryGroups = dataUtils.groupBy(response.expenses, 'category');
      const categoryBreakdown = Object.entries(categoryGroups).map(([categoryId, expenses]) => {
        const category = this.categories.find(c => c._id === categoryId);
        return {
          category: category?.name || 'Unknown',
          amount: expenses.reduce((sum, e) => sum + e.amount, 0),
          count: expenses.length,
        };
      });

      return {
        ...response,
        summary: {
          totalAmount: stats.sum,
          averageAmount: stats.average,
          categoryBreakdown,
        },
      };
    } catch (error) {
      console.error('Failed to load expenses:', error);
      throw error;
    }
  }

  /**
   * Create expense with validation
   */
  static async createExpense(data: CreateExpenseData): Promise<{
    success: boolean;
    expense?: Expense;
    errors?: Record<string, string>;
  }> {
    // Validate expense data
    const errors: Record<string, string> = {};

    const amountValidation = validationUtils.expenseAmount(data.amount);
    if (!amountValidation.valid) {
      errors.amount = amountValidation.message!;
    }

    if (!validationUtils.required(data.description)) {
      errors.description = t('forms.expense.description.validation.required');
    }

    if (!validationUtils.stringLength(data.description, 3, 200)) {
      errors.description = t('forms.expense.description.validation.minLength');
    }

    const dateValidation = validationUtils.date(data.date);
    if (!dateValidation.valid) {
      errors.date = dateValidation.message!;
    }

    if (!validationUtils.required(data.category)) {
      errors.category = t('forms.expense.category.validation.required');
    }

    if (!validationUtils.required(data.paidBy)) {
      errors.paidBy = t('forms.expense.paidBy.validation.required');
    }

    if (Object.keys(errors).length > 0) {
      return { success: false, errors };
    }

    try {
      const expense = await ExpensesDataSource.createExpense(data);
      return { success: true, expense };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { 
        success: false, 
        errors: { general: t('messages.expense.createFailed') }
      };
    }
  }

  /**
   * Update expense with validation
   */
  static async updateExpense(id: string, data: UpdateExpenseData): Promise<{
    success: boolean;
    expense?: Expense;
    errors?: Record<string, string>;
  }> {
    try {
      const expense = await ExpensesDataSource.updateExpense(id, data);
      return { success: true, expense };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { 
        success: false, 
        errors: { general: t('messages.expense.updateFailed') }
      };
    }
  }

  /**
   * Delete expense
   */
  static async deleteExpense(id: string): Promise<{
    success: boolean;
    message?: string;
  }> {
    try {
      const result = await ExpensesDataSource.deleteExpense(id);
      return result;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { 
        success: false, 
        message: t('messages.expense.deleteFailed')
      };
    }
  }

  /**
   * Export expenses to different formats
   */
  static async exportExpenses(
    filters?: ExpenseFilters, 
    format: 'csv' | 'json' = 'csv'
  ): Promise<{ success: boolean; data?: string; filename?: string }> {
    try {
      const response = await ExpensesDataSource.getExpenses({ ...filters, limit: 10000 });
      
      if (format === 'csv') {
        const { exportUtils } = await import('@/lib/utils/enhanced');
        const csvData = exportUtils.toCSV(response.expenses, [
          { key: 'date', header: 'Date' },
          { key: 'description', header: 'Description' },
          { key: 'amount', header: 'Amount' },
          { key: 'categoryName', header: 'Category' },
          { key: 'paidBy', header: 'Paid By' },
          { key: 'isSplit', header: 'Split' },
        ]);
        
        const filename = exportUtils.generateFilename('expenses', 'csv');
        return { success: true, data: csvData, filename };
      } else {
        const { exportUtils } = await import('@/lib/utils/enhanced');
        const jsonData = exportUtils.toJSON(response.expenses, true);
        const filename = exportUtils.generateFilename('expenses', 'json');
        return { success: true, data: jsonData, filename };
      }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return { success: false };
    }
  }

  /**
   * Get expense form configuration
   */
  static getFormConfig(): {
    fields: Array<{
      name: string;
      label: string;
      type: string;
      placeholder: string;
      required: boolean;
      options?: Array<{ label: string; value: any }>;
      validation: any;
    }>;
  } {
    return {
      fields: [
        {
          name: 'amount',
          label: t('forms.expense.amount.label'),
          type: 'number',
          placeholder: t('forms.expense.amount.placeholder'),
          required: true,
          validation: {
            required: t('forms.expense.amount.validation.required'),
            min: { value: 0.01, message: t('forms.expense.amount.validation.min') },
            max: { value: 10000, message: t('forms.expense.amount.validation.max') },
          },
        },
        {
          name: 'description',
          label: t('forms.expense.description.label'),
          type: 'text',
          placeholder: t('forms.expense.description.placeholder'),
          required: true,
          validation: {
            required: t('forms.expense.description.validation.required'),
            minLength: { value: 3, message: t('forms.expense.description.validation.minLength') },
            maxLength: { value: 200, message: t('forms.expense.description.validation.maxLength') },
          },
        },
        {
          name: 'date',
          label: t('forms.expense.date.label'),
          type: 'date',
          placeholder: t('forms.expense.date.placeholder'),
          required: true,
          validation: {
            required: t('forms.expense.date.validation.required'),
          },
        },
        {
          name: 'category',
          label: t('forms.expense.category.label'),
          type: 'select',
          placeholder: t('forms.expense.category.placeholder'),
          required: true,
          options: this.categories.map(cat => ({ label: cat.name, value: cat._id })),
          validation: {
            required: t('forms.expense.category.validation.required'),
          },
        },
        {
          name: 'paidBy',
          label: t('forms.expense.paidBy.label'),
          type: 'select',
          placeholder: t('forms.expense.paidBy.placeholder'),
          required: true,
          options: TranslationService.getSelectOptions('users').filter(u => u.value !== 'all'),
          validation: {
            required: t('forms.expense.paidBy.validation.required'),
          },
        },
        {
          name: 'isSplit',
          label: t('forms.expense.isSplit.label'),
          type: 'checkbox',
          placeholder: '',
          required: false,
          validation: {},
        },
      ],
    };
  }

  /**
   * Process expense data for display
   */
  static processForDisplay(expenses: Expense[]): Array<Expense & {
    formattedAmount: string;
    formattedDate: string;
    categoryName: string;
    typeLabel: string;
  }> {
    return expenses.map(expense => ({
      ...expense,
      formattedAmount: formatCurrency(expense.amount),
      formattedDate: formatDate(expense.date),
      categoryName: this.categories.find(c => c._id === expense.category)?.name || 'Unknown',
      typeLabel: expense.isSplit ? t('status.expense.split.label') : t('status.expense.personal.label'),
    }));
  }

  /**
   * Get quick stats for dashboard
   */
  static async getQuickStats(): Promise<{
    todayTotal: number;
    weekTotal: number;
    monthTotal: number;
    yearTotal: number;
    totalCount: number;
    categories: Array<{ name: string; amount: number; percentage: number }>;
  }> {
    try {
      const [todayExpenses, weekExpenses, monthExpenses, yearExpenses] = await Promise.all([
        ExpensesDataSource.getExpenses({ 
          startDate: dateUtils.getRange('today').start.toISOString(),
          endDate: dateUtils.getRange('today').end.toISOString(),
        }),
        ExpensesDataSource.getExpenses({ 
          startDate: dateUtils.getRange('week').start.toISOString(),
          endDate: dateUtils.getRange('week').end.toISOString(),
        }),
        ExpensesDataSource.getExpenses({ 
          startDate: dateUtils.getRange('month').start.toISOString(),
          endDate: dateUtils.getRange('month').end.toISOString(),
        }),
        ExpensesDataSource.getExpenses({ 
          startDate: dateUtils.getRange('year').start.toISOString(),
          endDate: dateUtils.getRange('year').end.toISOString(),
        }),
      ]);

      const todayTotal = todayExpenses.expenses.reduce((sum, e) => sum + e.amount, 0);
      const weekTotal = weekExpenses.expenses.reduce((sum, e) => sum + e.amount, 0);
      const monthTotal = monthExpenses.expenses.reduce((sum, e) => sum + e.amount, 0);
      const yearTotal = yearExpenses.expenses.reduce((sum, e) => sum + e.amount, 0);

      // Calculate category breakdown for current month
      const categoryGroups = dataUtils.groupBy(monthExpenses.expenses, 'category');
      const categories = Object.entries(categoryGroups).map(([categoryId, expenses]) => {
        const category = this.categories.find(c => c._id === categoryId);
        const amount = expenses.reduce((sum, e) => sum + e.amount, 0);
        return {
          name: category?.name || 'Unknown',
          amount,
          percentage: monthTotal > 0 ? (amount / monthTotal) * 100 : 0,
        };
      }).sort((a, b) => b.amount - a.amount);

      return {
        todayTotal,
        weekTotal,
        monthTotal,
        yearTotal,
        totalCount: yearExpenses.total,
        categories,
      };
    } catch (error) {
      console.error('Failed to get quick stats:', error);
      return {
        todayTotal: 0,
        weekTotal: 0,
        monthTotal: 0,
        yearTotal: 0,
        totalCount: 0,
        categories: [],
      };
    }
  }
}

// Export the expense manager as default
export default ExpenseManager;