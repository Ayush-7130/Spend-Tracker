/**
 * Notification utilities for common operations
 */

export interface NotificationConfig {
  title: string;
  message?: string;
  duration?: number;
}

/**
 * Generate notification configurations for common CRUD operations
 */
export const getNotificationConfig = {
  // Success notifications
  added: (item: string): NotificationConfig => ({
    title: "Added Successfully",
    message: `${item} has been added successfully`,
  }),

  updated: (item: string): NotificationConfig => ({
    title: "Updated Successfully",
    message: `${item} has been updated successfully`,
  }),

  deleted: (item: string): NotificationConfig => ({
    title: "Deleted Successfully",
    message: `${item} has been deleted successfully`,
  }),

  // Bulk operations
  bulkDeleted: (count: number, item: string): NotificationConfig => ({
    title: "Bulk Delete Successful",
    message: `${count} ${item}(s) have been deleted successfully`,
  }),

  // Error notifications
  addError: (item: string, error?: string): NotificationConfig => ({
    title: `Failed to Add ${item}`,
    message: error || `An error occurred while adding ${item}`,
    duration: 7000,
  }),

  updateError: (item: string, error?: string): NotificationConfig => ({
    title: `Failed to Update ${item}`,
    message: error || `An error occurred while updating ${item}`,
    duration: 7000,
  }),

  deleteError: (item: string, error?: string): NotificationConfig => ({
    title: `Failed to Delete ${item}`,
    message: error || `An error occurred while deleting ${item}`,
    duration: 7000,
  }),

  // Network/API errors
  networkError: (operation: string): NotificationConfig => ({
    title: "Network Error",
    message: `Failed to ${operation}. Please check your connection and try again.`,
    duration: 7000,
  }),

  // Validation errors
  validationError: (message: string): NotificationConfig => ({
    title: "Validation Error",
    message,
    duration: 6000,
  }),

  // Info notifications
  info: (title: string, message?: string): NotificationConfig => ({
    title,
    message,
  }),

  // Warning notifications
  warning: (title: string, message?: string): NotificationConfig => ({
    title,
    message,
    duration: 6000,
  }),
};

/**
 * Common notification messages for different entity types
 */
export const NOTIFICATION_MESSAGES = {
  EXPENSE: "Expense",
  SETTLEMENT: "Settlement",
  CATEGORY: "Category",
  SUBCATEGORY: "Subcategory",
} as const;

/**
 * Generate confirmation dialog configurations
 */
export const getConfirmationConfig = {
  delete: (item: string) => ({
    title: `Delete ${item}?`,
    message: `Are you sure you want to delete this ${item.toLowerCase()}? This action cannot be undone.`,
    confirmText: "Delete",
    cancelText: "Cancel",
    type: "danger" as const,
  }),

  bulkDelete: (count: number, item: string) => ({
    title: `Delete ${count} ${item}(s)?`,
    message: `Are you sure you want to delete ${count} selected ${item.toLowerCase()}(s)? This action cannot be undone.`,
    confirmText: `Delete ${count} item(s)`,
    cancelText: "Cancel",
    type: "danger" as const,
  }),
};
