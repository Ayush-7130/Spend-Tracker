/**
 * Data fetching and API utilities
 */

/**
 * Generic data fetcher with error handling
 */
export const fetchData = async <T>(
  url: string,
  options?: RequestInit
): Promise<{ success: boolean; data?: T; error?: string }> => {
  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `HTTP error! status: ${response.status}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error fetching data from ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to fetch data'
    };
  }
};

/**
 * Generic delete function with confirmation
 */
export const deleteItem = async (
  url: string,
  itemName: string = 'item',
  confirmMessage?: string
): Promise<{ success: boolean; error?: string }> => {
  const message = confirmMessage || `Are you sure you want to delete this ${itemName}?`;
  
  if (!confirm(message)) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    const response = await fetch(url, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const result = await response.json();
      throw new Error(result.error || `Failed to delete ${itemName}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error(`Error deleting ${itemName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to delete ${itemName}`
    };
  }
};

/**
 * Generic bulk delete function
 */
export const bulkDelete = async (
  ids: string[],
  baseUrl: string,
  itemName: string = 'items'
): Promise<{ success: boolean; error?: string }> => {
  if (ids.length === 0) {
    return { success: false, error: 'No items selected' };
  }

  if (!confirm(`Delete ${ids.length} ${itemName}?`)) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    const promises = ids.map(id => 
      fetch(`${baseUrl}/${id}`, { method: 'DELETE' })
    );
    
    await Promise.all(promises);
    return { success: true };
  } catch (error) {
    console.error(`Error bulk deleting ${itemName}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to delete ${itemName}`
    };
  }
};

/**
 * Generic form submission handler
 */
export const submitForm = async <T>(
  url: string,
  data: T,
  method: 'POST' | 'PUT' = 'POST'
): Promise<{ success: boolean; data?: unknown; error?: string }> => {
  try {
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || `Failed to ${method.toLowerCase()} data`);
    }
    
    return result;
  } catch (error) {
    console.error(`Error submitting form to ${url}:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to submit form'
    };
  }
};

/**
 * Build URL with query parameters
 */
export const buildUrlWithParams = (
  baseUrl: string,
  params: Record<string, string | number | boolean | undefined>
): string => {
  const searchParams = new URLSearchParams();
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, value.toString());
    }
  });
  
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
};

/**
 * Generic pagination handler
 */
export interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const createPaginationHandler = (
  pagination: PaginationData,
  setPagination: (data: PaginationData) => void
) => ({
  goToPage: (page: number) => {
    setPagination({ ...pagination, page });
  },
  changeLimit: (limit: number) => {
    setPagination({ ...pagination, limit, page: 1 });
  },
  nextPage: () => {
    if (pagination.page < pagination.pages) {
      setPagination({ ...pagination, page: pagination.page + 1 });
    }
  },
  prevPage: () => {
    if (pagination.page > 1) {
      setPagination({ ...pagination, page: pagination.page - 1 });
    }
  }
});

/**
 * Generic sorting handler
 */
export interface SortConfig {
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

export const createSortHandler = (
  sortConfig: SortConfig,
  setSortConfig: (config: SortConfig) => void
) => ({
  handleSort: (column: string) => {
    const newOrder = sortConfig.sortBy === column && sortConfig.sortOrder === 'desc' ? 'asc' : 'desc';
    setSortConfig({ sortBy: column, sortOrder: newOrder });
  },
  getSortIcon: (column: string) => {
    if (sortConfig.sortBy !== column) return 'bi-arrow-down-up';
    return sortConfig.sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  }
});