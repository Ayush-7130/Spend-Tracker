'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';

interface Category {
  _id: string;
  name: string;
  description?: string;
  color?: string;
  createdAt: string;
  updatedAt: string;
  subcategories?: Array<{
    name: string;
    description: string;
  }>;
}

interface CategoriesContextType {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refetchCategories: () => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextType | undefined>(undefined);

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFetch, setLastFetch] = useState<number>(0);
  
  // Cache for 5 minutes
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

  const fetchCategories = useCallback(async (force = false) => {
    // Don't fetch if not authenticated
    if (!isAuthenticated) {
      setCategories([]);
      setLoading(false);
      setError(null);
      return;
    }

    const now = Date.now();
    
    // Don't fetch if we have recent data and not forced
    if (!force && categories.length > 0 && (now - lastFetch) < CACHE_DURATION) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        const categoriesData = result.success ? result.data : result;
        setCategories(categoriesData || []);
        setLastFetch(now);
      } else {
        throw new Error('Failed to fetch categories');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch categories');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, categories.length, lastFetch, CACHE_DURATION]);

  useEffect(() => {
    // Only fetch if not in auth loading state
    if (!authLoading) {
      fetchCategories();
    }
  }, [fetchCategories, authLoading]);

  // Clear categories when user logs out
  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      setCategories([]);
      setError(null);
      setLastFetch(0);
    }
  }, [isAuthenticated, authLoading]);

  const refetchCategories = () => fetchCategories(true);

  return (
    <CategoriesContext.Provider 
      value={{ 
        categories, 
        loading, 
        error, 
        refetchCategories 
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (context === undefined) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}