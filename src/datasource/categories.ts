import { api, withRetry } from './base';

// Category-related types
export interface Subcategory {
  name: string;
  description?: string;
  _id?: string;
}

export interface Category {
  _id: string;
  name: string;
  description?: string;
  subcategories?: Subcategory[];
  color?: string;
  icon?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryData {
  name: string;
  description?: string;
  subcategories?: Omit<Subcategory, '_id'>[];
  color?: string;
  icon?: string;
  isActive?: boolean;
}

export interface UpdateCategoryData extends Partial<CreateCategoryData> {
  _id: string;
}

export interface CategoryStats {
  _id: string;
  name: string;
  totalExpenses: number;
  expenseCount: number;
  averageExpense: number;
  percentage: number;
  monthlyTotal?: number;
  monthlyCount?: number;
}

// Categories Datasource
export class CategoriesDataSource {
  /**
   * Get all categories
   */
  static async getCategories(includeInactive: boolean = false): Promise<Category[]> {
    return withRetry(() => 
      api.get<Category[]>('/categories', { includeInactive })
    );
  }

  /**
   * Get a specific category by ID
   */
  static async getCategoryById(id: string): Promise<Category> {
    return withRetry(() => api.get<Category>(`/categories/${id}`));
  }

  /**
   * Create a new category
   */
  static async createCategory(categoryData: CreateCategoryData): Promise<Category> {
    return withRetry(() => api.post<Category>('/categories', categoryData));
  }

  /**
   * Update an existing category
   */
  static async updateCategory(id: string, categoryData: UpdateCategoryData): Promise<Category> {
    return withRetry(() => api.put<Category>(`/categories/${id}`, categoryData));
  }

  /**
   * Delete a category
   */
  static async deleteCategory(id: string): Promise<{ 
    success: boolean; 
    message: string;
    affectedExpenses?: number;
  }> {
    return withRetry(() => 
      api.delete<{ 
        success: boolean; 
        message: string;
        affectedExpenses?: number;
      }>(`/categories/${id}`)
    );
  }

  /**
   * Add a subcategory to an existing category
   */
  static async addSubcategory(
    categoryId: string, 
    subcategory: Omit<Subcategory, '_id'>
  ): Promise<Category> {
    return withRetry(() => 
      api.post<Category>(`/categories/${categoryId}/subcategories`, subcategory)
    );
  }

  /**
   * Update a subcategory
   */
  static async updateSubcategory(
    categoryId: string, 
    subcategoryId: string,
    subcategory: Partial<Subcategory>
  ): Promise<Category> {
    return withRetry(() => 
      api.put<Category>(`/categories/${categoryId}/subcategories/${subcategoryId}`, subcategory)
    );
  }

  /**
   * Delete a subcategory
   */
  static async deleteSubcategory(
    categoryId: string, 
    subcategoryId: string
  ): Promise<Category> {
    return withRetry(() => 
      api.delete<Category>(`/categories/${categoryId}/subcategories/${subcategoryId}`)
    );
  }

  /**
   * Get category statistics
   */
  static async getCategoryStats(
    timeframe?: 'week' | 'month' | 'year' | 'all'
  ): Promise<CategoryStats[]> {
    return withRetry(() => 
      api.get<CategoryStats[]>('/categories/stats', { timeframe: timeframe || 'all' })
    );
  }

  /**
   * Get categories with expense counts
   */
  static async getCategoriesWithCounts(): Promise<Array<Category & { expenseCount: number; totalAmount: number }>> {
    return withRetry(() => 
      api.get<Array<Category & { expenseCount: number; totalAmount: number }>>('/categories/with-counts')
    );
  }

  /**
   * Search categories by name
   */
  static async searchCategories(query: string): Promise<Category[]> {
    return withRetry(() => 
      api.get<Category[]>('/categories/search', { q: query })
    );
  }

  /**
   * Toggle category active status
   */
  static async toggleCategoryStatus(id: string): Promise<Category> {
    return withRetry(() => 
      api.patch<Category>(`/categories/${id}/toggle-status`)
    );
  }

  /**
   * Bulk delete categories
   */
  static async bulkDeleteCategories(ids: string[]): Promise<{ 
    success: boolean; 
    deleted: number; 
    failed: string[];
    totalAffectedExpenses: number;
  }> {
    return withRetry(() => 
      api.post('/categories/bulk-delete', { ids })
    );
  }

  /**
   * Reorder categories (for drag and drop functionality)
   */
  static async reorderCategories(categoryIds: string[]): Promise<{ success: boolean }> {
    return withRetry(() => 
      api.put('/categories/reorder', { categoryIds })
    );
  }

  /**
   * Get popular categories (most used)
   */
  static async getPopularCategories(limit: number = 5): Promise<CategoryStats[]> {
    return withRetry(() => 
      api.get<CategoryStats[]>('/categories/popular', { limit })
    );
  }

  /**
   * Import categories from a predefined list or CSV
   */
  static async importCategories(categories: CreateCategoryData[]): Promise<{
    imported: number;
    skipped: number;
    errors: string[];
  }> {
    return withRetry(() => 
      api.post('/categories/import', { categories })
    );
  }

  /**
   * Export categories to JSON format
   */
  static async exportCategories(): Promise<Category[]> {
    return withRetry(() => 
      api.get<Category[]>('/categories/export')
    );
  }
}

export default CategoriesDataSource;