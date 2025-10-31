// Translation types and interfaces
export interface TranslationConfig {
  // UI Labels and Text
  labels: Record<string, string>;
  
  // Form field labels and placeholders
  forms: Record<string, {
    label?: string;
    placeholder?: string;
    helperText?: string;
    validation?: Record<string, string>;
  }>;
  
  // Table column headers and cell formatters
  table: Record<string, {
    header?: string;
    formatter?: (value: any) => string;
    emptyValue?: string;
  }>;
  
  // Status and category mappings
  status: Record<string, {
    label: string;
    description?: string;
    color?: string;
    icon?: string;
  }>;
  
  // Messages and notifications
  messages: Record<string, string>;
  
  // Actions and buttons
  actions: Record<string, string>;
  
  // Navigation and menu items
  navigation: Record<string, string>;
  
  // Error messages
  errors: Record<string, string>;
  
  // Success messages
  success: Record<string, string>;
  
  // Currency and number formatting
  formatting: {
    currency: {
      symbol: string;
      position: 'before' | 'after';
      decimals: number;
    };
    date: {
      short: string;
      long: string;
      time: string;
    };
    number: {
      thousands: string;
      decimal: string;
    };
  };
}

// Default English translations
export const defaultTranslations: TranslationConfig = {
  labels: {
    // General
    'app.name': 'Spend Tracker',
    'app.tagline': 'Track your expenses with ease',
    
    // Common words
    'common.loading': 'Loading...',
    'common.saving': 'Saving...',
    'common.saved': 'Saved',
    'common.error': 'Error',
    'common.success': 'Success',
    'common.warning': 'Warning',
    'common.info': 'Information',
    'common.confirm': 'Confirm',
    'common.cancel': 'Cancel',
    'common.yes': 'Yes',
    'common.no': 'No',
    'common.ok': 'OK',
    'common.close': 'Close',
    'common.back': 'Back',
    'common.next': 'Next',
    'common.previous': 'Previous',
    'common.finish': 'Finish',
    'common.edit': 'Edit',
    'common.delete': 'Delete',
    'common.view': 'View',
    'common.add': 'Add',
    'common.create': 'Create',
    'common.update': 'Update',
    'common.search': 'Search',
    'common.filter': 'Filter',
    'common.sort': 'Sort',
    'common.export': 'Export',
    'common.import': 'Import',
    'common.clear': 'Clear',
    'common.reset': 'Reset',
    'common.apply': 'Apply',
    'common.remove': 'Remove',
    'common.select': 'Select',
    'common.all': 'All',
    'common.none': 'None',
    'common.total': 'Total',
    'common.subtotal': 'Subtotal',
    'common.amount': 'Amount',
    'common.date': 'Date',
    'common.time': 'Time',
    'common.name': 'Name',
    'common.description': 'Description',
    'common.category': 'Category',
    'common.status': 'Status',
    'common.type': 'Type',
    'common.user': 'User',
    'common.actions': 'Actions',
  },

  forms: {
    'expense.amount': {
      label: 'Amount',
      placeholder: 'Enter amount',
      helperText: 'The expense amount in dollars',
      validation: {
        required: 'Amount is required',
        min: 'Amount must be greater than 0',
        max: 'Amount cannot exceed $10,000',
      },
    },
    'expense.description': {
      label: 'Description',
      placeholder: 'What was this expense for?',
      helperText: 'Brief description of the expense',
      validation: {
        required: 'Description is required',
        minLength: 'Description must be at least 3 characters',
        maxLength: 'Description cannot exceed 200 characters',
      },
    },
    'expense.date': {
      label: 'Date',
      placeholder: 'Select date',
      helperText: 'When was this expense made?',
      validation: {
        required: 'Date is required',
        invalid: 'Please select a valid date',
      },
    },
    'expense.category': {
      label: 'Category',
      placeholder: 'Select category',
      helperText: 'Choose the appropriate category',
      validation: {
        required: 'Category is required',
      },
    },
    'expense.paidBy': {
      label: 'Paid By',
      placeholder: 'Who paid for this?',
      helperText: 'The person who made the payment',
      validation: {
        required: 'Paid by field is required',
      },
    },
    'expense.isSplit': {
      label: 'Split Expense',
      helperText: 'Check if this expense should be split between users',
    },
    'category.name': {
      label: 'Category Name',
      placeholder: 'Enter category name',
      validation: {
        required: 'Category name is required',
        unique: 'Category name already exists',
      },
    },
    'category.description': {
      label: 'Description',
      placeholder: 'Category description (optional)',
    },
    'settlement.amount': {
      label: 'Settlement Amount',
      placeholder: 'Enter amount to settle',
      validation: {
        required: 'Amount is required',
        min: 'Amount must be greater than 0',
      },
    },
    'settlement.fromUser': {
      label: 'From User',
      placeholder: 'Who owes money?',
      validation: {
        required: 'From user is required',
      },
    },
    'settlement.toUser': {
      label: 'To User',
      placeholder: 'Who should receive money?',
      validation: {
        required: 'To user is required',
      },
    },
  },

  table: {
    'expense.date': {
      header: 'Date',
      formatter: (value: string) => new Date(value).toLocaleDateString(),
      emptyValue: 'No date',
    },
    'expense.description': {
      header: 'Description',
      emptyValue: 'No description',
    },
    'expense.amount': {
      header: 'Amount',
      formatter: (value: number) => `$${value.toFixed(2)}`,
      emptyValue: '$0.00',
    },
    'expense.category': {
      header: 'Category',
      emptyValue: 'Uncategorized',
    },
    'expense.paidBy': {
      header: 'Paid By',
      emptyValue: 'Unknown',
    },
    'expense.isSplit': {
      header: 'Type',
      formatter: (value: boolean) => value ? 'Split' : 'Personal',
      emptyValue: 'Personal',
    },
    'settlement.status': {
      header: 'Status',
      emptyValue: 'Unknown',
    },
    'settlement.fromUser': {
      header: 'From',
      emptyValue: 'Unknown',
    },
    'settlement.toUser': {
      header: 'To',
      emptyValue: 'Unknown',
    },
  },

  status: {
    'settlement.pending': {
      label: 'Pending',
      description: 'Settlement is awaiting completion',
      color: 'warning',
      icon: 'clock',
    },
    'settlement.completed': {
      label: 'Completed',
      description: 'Settlement has been completed',
      color: 'success',
      icon: 'check',
    },
    'settlement.cancelled': {
      label: 'Cancelled',
      description: 'Settlement has been cancelled',
      color: 'danger',
      icon: 'times',
    },
    'expense.personal': {
      label: 'Personal',
      description: 'Personal expense',
      color: 'primary',
      icon: 'user',
    },
    'expense.split': {
      label: 'Split',
      description: 'Shared expense',
      color: 'info',
      icon: 'users',
    },
  },

  messages: {
    // Success messages
    'expense.created': 'Expense created successfully',
    'expense.updated': 'Expense updated successfully',
    'expense.deleted': 'Expense deleted successfully',
    'category.created': 'Category created successfully',
    'category.updated': 'Category updated successfully',
    'category.deleted': 'Category deleted successfully',
    'settlement.created': 'Settlement created successfully',
    'settlement.completed': 'Settlement completed successfully',
    'settlement.cancelled': 'Settlement cancelled successfully',
    
    // Error messages
    'expense.createFailed': 'Failed to create expense',
    'expense.updateFailed': 'Failed to update expense',
    'expense.deleteFailed': 'Failed to delete expense',
    'expense.notFound': 'Expense not found',
    'category.createFailed': 'Failed to create category',
    'category.updateFailed': 'Failed to update category',
    'category.deleteFailed': 'Failed to delete category',
    'category.notFound': 'Category not found',
    'settlement.createFailed': 'Failed to create settlement',
    'settlement.updateFailed': 'Failed to update settlement',
    'settlement.notFound': 'Settlement not found',
    
    // Info messages
    'expense.noData': 'No expenses found',
    'category.noData': 'No categories found',
    'settlement.noData': 'No settlements found',
    'filter.noResults': 'No results found for the selected filters',
    'search.noResults': 'No results found for your search',
    
    // Confirmation messages
    'expense.confirmDelete': 'Are you sure you want to delete this expense?',
    'category.confirmDelete': 'Are you sure you want to delete this category? This will affect all related expenses.',
    'settlement.confirmDelete': 'Are you sure you want to delete this settlement?',
    'settlement.confirmComplete': 'Are you sure you want to mark this settlement as completed?',
    'settlement.confirmCancel': 'Are you sure you want to cancel this settlement?',
    
    // Loading messages
    'expense.loading': 'Loading expenses...',
    'category.loading': 'Loading categories...',
    'settlement.loading': 'Loading settlements...',
    'dashboard.loading': 'Loading dashboard...',
    'analytics.loading': 'Loading analytics...',
  },

  actions: {
    'expense.add': 'Add Expense',
    'expense.edit': 'Edit Expense',
    'expense.delete': 'Delete Expense',
    'expense.duplicate': 'Duplicate Expense',
    'expense.export': 'Export Expenses',
    'expense.import': 'Import Expenses',
    'expense.bulkDelete': 'Delete Selected',
    'category.add': 'Add Category',
    'category.edit': 'Edit Category',
    'category.delete': 'Delete Category',
    'settlement.add': 'Add Settlement',
    'settlement.edit': 'Edit Settlement',
    'settlement.delete': 'Delete Settlement',
    'settlement.complete': 'Mark as Completed',
    'settlement.cancel': 'Cancel Settlement',
    'settlement.suggest': 'Suggest Settlements',
    'filter.apply': 'Apply Filters',
    'filter.clear': 'Clear Filters',
    'filter.reset': 'Reset Filters',
    'search.clear': 'Clear Search',
    'table.selectAll': 'Select All',
    'table.clearSelection': 'Clear Selection',
    'pagination.first': 'First Page',
    'pagination.previous': 'Previous Page',
    'pagination.next': 'Next Page',
    'pagination.last': 'Last Page',
  },

  navigation: {
    'nav.dashboard': 'Dashboard',
    'nav.expenses': 'Expenses',
    'nav.categories': 'Categories',
    'nav.settlements': 'Settlements',
    'nav.analytics': 'Analytics',
    'nav.profile': 'Profile',
    'nav.settings': 'Settings',
    'nav.help': 'Help',
    'nav.logout': 'Logout',
    
    // Sub-navigation
    'nav.analytics.overview': 'Overview',
    'nav.analytics.timeline': 'Timeline',
    'nav.analytics.user.saket': 'Saket\'s Analytics',
    'nav.analytics.user.ayush': 'Ayush\'s Analytics',
  },

  errors: {
    'network.error': 'Network error occurred. Please check your connection.',
    'server.error': 'Server error occurred. Please try again later.',
    'auth.error': 'Authentication error. Please log in again.',
    'validation.error': 'Please correct the errors and try again.',
    'permission.error': 'You don\'t have permission to perform this action.',
    'notFound.error': 'The requested resource was not found.',
    'timeout.error': 'Request timed out. Please try again.',
    'generic.error': 'An unexpected error occurred. Please try again.',
  },

  success: {
    'operation.completed': 'Operation completed successfully',
    'data.saved': 'Data saved successfully',
    'data.deleted': 'Data deleted successfully',
    'data.updated': 'Data updated successfully',
    'data.imported': 'Data imported successfully',
    'data.exported': 'Data exported successfully',
  },

  formatting: {
    currency: {
      symbol: '$',
      position: 'before',
      decimals: 2,
    },
    date: {
      short: 'MM/DD/YYYY',
      long: 'MMMM DD, YYYY',
      time: 'HH:mm',
    },
    number: {
      thousands: ',',
      decimal: '.',
    },
  },
};

// Translation utility functions
export class TranslationService {
  private static config: TranslationConfig = defaultTranslations;

  /**
   * Set translation configuration
   */
  static setConfig(config: Partial<TranslationConfig>) {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get translation for a key
   */
  static get(key: string, defaultValue?: string): string {
    const keys = key.split('.');
    let current: any = this.config;
    
    for (const k of keys) {
      if (current && typeof current === 'object' && k in current) {
        current = current[k];
      } else {
        return defaultValue || key;
      }
    }
    
    return typeof current === 'string' ? current : defaultValue || key;
  }

  /**
   * Get form configuration for a field
   */
  static getFormConfig(key: string) {
    return this.config.forms[key] || {};
  }

  /**
   * Get table configuration for a column
   */
  static getTableConfig(key: string) {
    return this.config.table[key] || {};
  }

  /**
   * Get status configuration
   */
  static getStatusConfig(key: string) {
    return this.config.status[key] || {};
  }

  /**
   * Format currency value
   */
  static formatCurrency(value: number): string {
    const { symbol, position, decimals } = this.config.formatting.currency;
    const formatted = value.toFixed(decimals);
    return position === 'before' ? `${symbol}${formatted}` : `${formatted}${symbol}`;
  }

  /**
   * Format date value
   */
  static formatDate(date: Date | string, format: 'short' | 'long' | 'time' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    
    switch (format) {
      case 'short':
        return d.toLocaleDateString();
      case 'long':
        return d.toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
      case 'time':
        return d.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit' 
        });
      default:
        return d.toLocaleDateString();
    }
  }

  /**
   * Format number with thousands separator
   */
  static formatNumber(value: number): string {
    const { thousands, decimal } = this.config.formatting.number;
    return value.toLocaleString('en-US').replace(',', thousands).replace('.', decimal);
  }

  /**
   * Get translated options for select fields
   */
  static getSelectOptions(key: string): Array<{ label: string; value: any }> {
    // Common select options that might need translation
    const options: Record<string, Array<{ label: string; value: any }>> = {
      users: [
        { label: this.get('labels.common.all'), value: 'all' },
        { label: 'Saket', value: 'saket' },
        { label: 'Ayush', value: 'ayush' },
      ],
      settlementStatus: [
        { label: this.get('status.settlement.pending.label'), value: 'pending' },
        { label: this.get('status.settlement.completed.label'), value: 'completed' },
        { label: this.get('status.settlement.cancelled.label'), value: 'cancelled' },
      ],
      expenseType: [
        { label: this.get('status.expense.personal.label'), value: false },
        { label: this.get('status.expense.split.label'), value: true },
      ],
    };
    
    return options[key] || [];
  }
}

// Export convenience functions
export const t = TranslationService.get;
export const formatCurrency = TranslationService.formatCurrency;
export const formatDate = TranslationService.formatDate;
export const formatNumber = TranslationService.formatNumber;