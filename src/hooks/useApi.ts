/**
 * Generic API Hooks
 *
 * Reusable hooks for common API patterns like list fetching, detail views,
 * and mutations (create/update/delete). These hooks handle loading states,
 * error handling, and data management automatically.
 */

import { useState, useEffect, useCallback } from "react";
import { ApiError } from "@/datasource/base";

// ===========================================================================
// TYPES
// ===========================================================================

export interface UseListOptions<TFilters = any> {
  /** Initial filters to apply */
  initialFilters?: TFilters;
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** Dependencies to trigger refetch */
  dependencies?: any[];
}

export interface UseListResult<TItem, TFilters = any> {
  /** List of items */
  data: TItem[];
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Current filters */
  filters: TFilters;
  /** Update filters and refetch */
  setFilters: (filters: TFilters) => void;
  /** Manually refetch data */
  refetch: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export interface UseDetailOptions {
  /** Auto-fetch on mount */
  autoFetch?: boolean;
  /** ID of the item to fetch */
  id?: string | null;
}

export interface UseDetailResult<TItem> {
  /** Item data */
  data: TItem | null;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Manually refetch data */
  refetch: () => Promise<void>;
  /** Clear error */
  clearError: () => void;
}

export interface UseMutationOptions<TData = any> {
  /** Success callback */
  onSuccess?: (data: TData) => void;
  /** Error callback */
  onError?: (error: string) => void;
}

export interface UseMutationResult<TData = any, TVariables = any> {
  /** Execute the mutation */
  mutate: (variables: TVariables) => Promise<TData | null>;
  /** Async version that returns data or throws */
  mutateAsync: (variables: TVariables) => Promise<TData>;
  /** Loading state */
  loading: boolean;
  /** Error state */
  error: string | null;
  /** Success state */
  success: boolean;
  /** Clear error and success states */
  reset: () => void;
}

export interface UsePaginatedListOptions<
  TFilters = any,
> extends UseListOptions<TFilters> {
  /** Items per page */
  pageSize?: number;
}

export interface PaginationState {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface UsePaginatedListResult<
  TItem,
  TFilters = any,
> extends UseListResult<TItem, TFilters> {
  /** Pagination state */
  pagination: PaginationState;
  /** Go to specific page */
  goToPage: (page: number) => void;
  /** Go to next page */
  nextPage: () => void;
  /** Go to previous page */
  prevPage: () => void;
}

// ===========================================================================
// HOOK: useList
// Generic hook for fetching lists of items
// ===========================================================================

/**
 * Generic hook for fetching and managing lists of data
 *
 * @example
 * ```tsx
 * const { data: expenses, loading, error, setFilters } = useList(
 *   ExpensesDataSource.getExpenses,
 *   { initialFilters: { user: 'all' } }
 * );
 * ```
 */
export function useList<TItem, TFilters = any>(
  fetchFn: (filters?: TFilters) => Promise<TItem[]>,
  options: UseListOptions<TFilters> = {}
): UseListResult<TItem, TFilters> {
  const {
    initialFilters = {} as TFilters,
    autoFetch = true,
    dependencies = [],
  } = options;

  const [data, setData] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TFilters>(initialFilters);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(filters);
      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, filters, ...dependencies]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  const setFilters = useCallback((newFilters: TFilters) => {
    setFiltersState(newFilters);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchData,
    clearError,
  };
}

// ===========================================================================
// HOOK: usePaginatedList
// Generic hook for fetching paginated lists
// ===========================================================================

/**
 * Generic hook for fetching and managing paginated lists of data
 *
 * @example
 * ```tsx
 * const { data, loading, pagination, goToPage } = usePaginatedList(
 *   ExpensesDataSource.getExpenses,
 *   { pageSize: 10 }
 * );
 * ```
 */
export function usePaginatedList<TItem, TFilters = any>(
  fetchFn: (filters?: TFilters) => Promise<{
    items?: TItem[];
    expenses?: TItem[];
    settlements?: TItem[];
    categories?: TItem[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>,
  options: UsePaginatedListOptions<TFilters> = {}
): UsePaginatedListResult<TItem, TFilters> {
  const {
    initialFilters = {} as TFilters,
    autoFetch = true,
    pageSize = 10,
    dependencies = [],
  } = options;

  const [data, setData] = useState<TItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<TFilters>({
    ...initialFilters,
    page: 1,
    limit: pageSize,
  } as TFilters);
  const [pagination, setPagination] = useState<PaginationState>({
    page: 1,
    limit: pageSize,
    total: 0,
    totalPages: 0,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(filters);

      // Handle different response structures
      const items =
        result.items ||
        result.expenses ||
        result.settlements ||
        result.categories ||
        [];

      setData(items as TItem[]);
      setPagination({
        page: result.page,
        limit: result.limit,
        total: result.total,
        totalPages: result.totalPages,
      });
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchFn, filters, ...dependencies]);

  useEffect(() => {
    if (autoFetch) {
      fetchData();
    }
  }, [autoFetch, fetchData]);

  const setFilters = useCallback(
    (newFilters: TFilters) => {
      setFiltersState({
        ...newFilters,
        page: 1, // Reset to page 1 when filters change
        limit: pageSize,
      } as TFilters);
    },
    [pageSize]
  );

  const goToPage = useCallback((page: number) => {
    setFiltersState(
      (prev) =>
        ({
          ...prev,
          page,
        }) as TFilters
    );
  }, []);

  const nextPage = useCallback(() => {
    if (pagination.page < pagination.totalPages) {
      goToPage(pagination.page + 1);
    }
  }, [pagination.page, pagination.totalPages, goToPage]);

  const prevPage = useCallback(() => {
    if (pagination.page > 1) {
      goToPage(pagination.page - 1);
    }
  }, [pagination.page, goToPage]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    setFilters,
    refetch: fetchData,
    clearError,
    pagination,
    goToPage,
    nextPage,
    prevPage,
  };
}

// ===========================================================================
// HOOK: useDetail
// Generic hook for fetching single item details
// ===========================================================================

/**
 * Generic hook for fetching details of a single item
 *
 * @example
 * ```tsx
 * const { data: expense, loading, error } = useDetail(
 *   ExpensesDataSource.getExpenseById,
 *   { id: expenseId }
 * );
 * ```
 */
export function useDetail<TItem>(
  fetchFn: (id: string) => Promise<TItem>,
  options: UseDetailOptions = {}
): UseDetailResult<TItem> {
  const { autoFetch = true, id } = options;

  const [data, setData] = useState<TItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) {
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(id);
      setData(result);
    } catch (err) {
      const errorMessage =
        err instanceof ApiError
          ? err.message
          : "An error occurred while fetching data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [fetchFn, id]);

  useEffect(() => {
    if (autoFetch && id) {
      fetchData();
    }
  }, [autoFetch, id, fetchData]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    data,
    loading,
    error,
    refetch: fetchData,
    clearError,
  };
}

// ===========================================================================
// HOOK: useMutation
// Generic hook for create/update/delete operations
// ===========================================================================

/**
 * Generic hook for mutations (create, update, delete)
 *
 * @example
 * ```tsx
 * const { mutate: createExpense, loading } = useMutation(
 *   ExpensesDataSource.createExpense,
 *   {
 *     onSuccess: () => {
 *       showNotification('Expense created!', 'success');
 *       refetch();
 *     }
 *   }
 * );
 * ```
 */
export function useMutation<TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: UseMutationOptions<TData> = {}
): UseMutationResult<TData, TVariables> {
  const { onSuccess, onError } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutateAsync = useCallback(
    async (variables: TVariables): Promise<TData> => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const result = await mutationFn(variables);
        setSuccess(true);
        onSuccess?.(result);
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof ApiError
            ? err.message
            : "An error occurred during the operation";
        setError(errorMessage);
        onError?.(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutationFn, onSuccess, onError]
  );

  const mutate = useCallback(
    async (variables: TVariables): Promise<TData | null> => {
      try {
        return await mutateAsync(variables);
      } catch {
        return null;
      }
    },
    [mutateAsync]
  );

  const reset = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    mutate,
    mutateAsync,
    loading,
    error,
    success,
    reset,
  };
}

// ===========================================================================
// HOOK: useDataState
// Simple hook for common data, loading, error pattern
// ===========================================================================

/**
 * Simple hook for managing data, loading, and error states
 * Useful for custom fetch logic that doesn't fit the generic patterns
 *
 * @example
 * ```tsx
 * const { data, loading, error, setData, setLoading, setError } = useDataState<User>();
 * ```
 */
export function useDataState<TData = any>(initialData: TData | null = null) {
  const [data, setData] = useState<TData | null>(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const reset = useCallback(() => {
    setData(initialData);
    setLoading(false);
    setError(null);
  }, [initialData]);

  return {
    data,
    loading,
    error,
    setData,
    setLoading,
    setError,
    clearError,
    reset,
  };
}

// ===========================================================================
// EXPORTS
// ===========================================================================

const useApiHooks = {
  useList,
  usePaginatedList,
  useDetail,
  useMutation,
  useDataState,
};

export default useApiHooks;
