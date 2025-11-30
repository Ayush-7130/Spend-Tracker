/**
 * In-Memory Cache Implementation
 *
 * Provides a simple in-memory cache for frequently accessed data.
 * For production, consider using Redis or similar distributed cache.
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheManager {
  private cache: Map<string, CacheEntry<any>>;
  private static instance: CacheManager;

  private constructor() {
    this.cache = new Map();
    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Get value from cache
   * @param key Cache key
   * @returns Cached value or null if not found or expired
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Entry expired, remove it
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   * @param key Cache key
   * @param data Data to cache
   * @param ttl Time to live in milliseconds (default: 5 minutes)
   */
  set<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Delete value from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Delete all values matching a pattern
   * @param pattern String pattern to match keys
   */
  deletePattern(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach((key) => this.cache.delete(key));
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const cache = CacheManager.getInstance();

/**
 * Helper function to wrap async operations with caching
 * @param key Cache key
 * @param fetcher Function to fetch data if not in cache
 * @param ttl Time to live in milliseconds
 */
export async function withCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 5 * 60 * 1000
): Promise<T> {
  // Try to get from cache
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch fresh data
  const data = await fetcher();

  // Store in cache
  cache.set(key, data, ttl);

  return data;
}

/**
 * Cache key generators for common patterns
 */
export const cacheKeys = {
  expense: (id: string) => `expense:${id}`,
  expenses: (page: number, limit: number, filters: string) =>
    `expenses:${page}:${limit}:${filters}`,
  category: (id: string) => `category:${id}`,
  categories: () => `categories:all`,
  dashboard: (user: string) => `dashboard:${user}`,
  analytics: (type: string, user: string, params: string) =>
    `analytics:${type}:${user}:${params}`,
  user: (id: string) => `user:${id}`,
};

/**
 * Invalidate cache patterns when data changes
 */
export const invalidateCache = {
  expense: () => {
    cache.deletePattern("^expense:");
    cache.deletePattern("^expenses:");
    cache.deletePattern("^dashboard:");
    cache.deletePattern("^analytics:");
  },
  category: () => {
    cache.deletePattern("^category:");
    cache.deletePattern("^categories:");
    cache.deletePattern("^expenses:");
  },
  settlement: () => {
    cache.deletePattern("^settlement:");
    cache.deletePattern("^settlements:");
    cache.deletePattern("^dashboard:");
  },
};
