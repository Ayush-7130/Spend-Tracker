/**
 * Performance Monitoring Utilities
 *
 * Tools for monitoring and optimizing application performance.
 */

// ===========================================================================
// WEB VITALS MONITORING
// ===========================================================================

/**
 * Web Vitals metric type
 */
export interface WebVitalsMetric {
  name: "CLS" | "FCP" | "FID" | "LCP" | "TTFB" | "INP";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  delta: number;
  id: string;
}

/**
 * Report Web Vitals to analytics
 * Can be used with Next.js reportWebVitals in _app.tsx
 */
export function reportWebVitals(metric: WebVitalsMetric): void {
  if (process.env.NODE_ENV === "production") {
    // Log to console in development

    // In production, send to analytics service
    // Example: Google Analytics
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", metric.name, {
        value: Math.round(
          metric.name === "CLS" ? metric.value * 1000 : metric.value
        ),
        event_category: "Web Vitals",
        event_label: metric.id,
        non_interaction: true,
      });
    }

    // Example: Custom API endpoint
    // navigator.sendBeacon('/api/analytics/vitals', JSON.stringify(metric));
  }
}

/**
 * Get Web Vitals thresholds
 */
export const webVitalsThresholds = {
  LCP: { good: 2500, poor: 4000 }, // Largest Contentful Paint
  FID: { good: 100, poor: 300 }, // First Input Delay
  CLS: { good: 0.1, poor: 0.25 }, // Cumulative Layout Shift
  FCP: { good: 1800, poor: 3000 }, // First Contentful Paint
  TTFB: { good: 800, poor: 1800 }, // Time to First Byte
  INP: { good: 200, poor: 500 }, // Interaction to Next Paint
};

/**
 * Get rating for a metric value
 */
export function getMetricRating(
  metricName: keyof typeof webVitalsThresholds,
  value: number
): "good" | "needs-improvement" | "poor" {
  const threshold = webVitalsThresholds[metricName];
  if (value <= threshold.good) return "good";
  if (value <= threshold.poor) return "needs-improvement";
  return "poor";
}

// ===========================================================================
// PERFORMANCE MEASUREMENT
// ===========================================================================

/**
 * Measure execution time of a function
 */
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (process.env.NODE_ENV === "development") {
    console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * Create a performance mark
 */
export function mark(name: string): void {
  if (typeof window !== "undefined" && window.performance) {
    performance.mark(name);
  }
}

/**
 * Measure performance between two marks
 */
export function measure(
  name: string,
  startMark: string,
  endMark: string
): number | null {
  if (typeof window !== "undefined" && window.performance) {
    try {
      performance.measure(name, startMark, endMark);
      const measure = performance.getEntriesByName(name)[0] as PerformanceEntry;
      return measure.duration;
    } catch (error) {
      return null;
    }
  }
  return null;
}

/**
 * Clear performance marks and measures
 */
export function clearMarks(name?: string): void {
  if (typeof window !== "undefined" && window.performance) {
    if (name) {
      performance.clearMarks(name);
      performance.clearMeasures(name);
    } else {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

// ===========================================================================
// REACT PERFORMANCE HOOKS
// ===========================================================================

/**
 * Log component render performance (use in useEffect)
 */
export function logRenderPerformance(componentName: string, deps: any[]): void {
  if (process.env.NODE_ENV === "development") {
    console.log(`[Render] ${componentName}`, deps);
  }
}

/**
 * Detect slow renders (> 16ms for 60fps)
 */
export function detectSlowRender(
  componentName: string,
  threshold: number = 16
): void {
  if (typeof window !== "undefined" && window.performance) {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;

    // Mark start in useEffect
    setTimeout(() => {
      mark(startMark);
    }, 0);

    // Mark end after render
    requestAnimationFrame(() => {
      mark(endMark);
      const duration = measure(componentName, startMark, endMark);

      if (duration && duration > threshold) {
        console.warn(
          `Slow render detected in ${componentName}: ${duration.toFixed(2)}ms (threshold: ${threshold}ms)`
        );
      }
    });
  }
}

// ===========================================================================
// DEBOUNCE & THROTTLE
// ===========================================================================

/**
 * Debounce function - delays execution until after wait time has elapsed
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function (...args: Parameters<T>) {
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
}

/**
 * Throttle function - limits execution to once per wait time
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;

  return function (...args: Parameters<T>) {
    const now = Date.now();

    if (now - lastCall >= wait) {
      lastCall = now;
      func(...args);
    }
  };
}

// ===========================================================================
// LAZY LOADING
// ===========================================================================

/**
 * Intersection Observer for lazy loading
 */
export function createLazyLoader(
  callback: (entry: IntersectionObserverEntry) => void,
  options?: IntersectionObserverInit
): IntersectionObserver | null {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return null;
  }

  return new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        callback(entry);
      }
    });
  }, options);
}

/**
 * Preload image
 */
export function preloadImage(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = src;
  });
}

/**
 * Preload multiple images
 */
export async function preloadImages(sources: string[]): Promise<void[]> {
  return Promise.all(sources.map(preloadImage));
}

// ===========================================================================
// BUNDLE SIZE
// ===========================================================================

/**
 * Log bundle size information (development only)
 */
export function logBundleInfo(): void {
  if (process.env.NODE_ENV === "development" && typeof window !== "undefined") {
    const entries = performance.getEntriesByType(
      "resource"
    ) as PerformanceResourceTiming[];
    const scriptEntries = entries.filter((entry) => entry.name.includes(".js"));

    let totalSize = 0;
    const scripts: { name: string; size: number }[] = [];

    scriptEntries.forEach((entry) => {
      const size = entry.transferSize || entry.encodedBodySize || 0;
      totalSize += size;
      scripts.push({
        name: entry.name.split("/").pop() || entry.name,
        size,
      });
    });

    console.log(`[Bundle] Total JS size: ${(totalSize / 1024).toFixed(2)} KB`);
    scripts
      .sort((a, b) => b.size - a.size)
      .forEach(({ name, size }) => {
        console.log(`  ${name}: ${(size / 1024).toFixed(2)} KB`);
      });
  }
}

// ===========================================================================
// MEMORY MONITORING
// ===========================================================================

/**
 * Get memory usage information (Chrome only)
 */
export function getMemoryUsage(): {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
} | null {
  if (
    typeof window !== "undefined" &&
    "performance" in window &&
    "memory" in (window.performance as any)
  ) {
    const memory = (window.performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
    };
  }
  return null;
}

/**
 * Log memory usage (Chrome only)
 */
export function logMemoryUsage(): void {
  const memory = getMemoryUsage();
  if (memory) {
    console.log("[Memory Usage]", {
      used: `${(memory.usedJSHeapSize / 1048576).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1048576).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1048576).toFixed(2)} MB`,
    });
  }
}

// ===========================================================================
// API PERFORMANCE
// ===========================================================================

/**
 * Monitor API request performance
 */
export async function monitorApiCall<T>(
  url: string,
  fetchFn: () => Promise<T>
): Promise<T> {
  const start = performance.now();

  try {
    const result = await fetchFn();
    const duration = performance.now() - start;

    if (process.env.NODE_ENV === "development") {
      const color =
        duration > 1000 ? "red" : duration > 500 ? "orange" : "green";
      console.log(
        `%c[API] ${url}: ${duration.toFixed(2)}ms`,
        `color: ${color}; font-weight: bold`
      );
    }

    return result;
  } catch (error) {
    const duration = performance.now() - start;
    console.error(`[API Error] ${url}: ${duration.toFixed(2)}ms`, error);
    throw error;
  }
}

/**
 * Cache API responses in memory
 */
export class ApiCache<T = any> {
  private cache: Map<string, { data: T; timestamp: number }> = new Map();
  private ttl: number;

  constructor(ttl: number = 5 * 60 * 1000) {
    // Default 5 minutes
    this.ttl = ttl;
  }

  get(key: string): T | null {
    const cached = this.cache.get(key);

    if (!cached) return null;

    const now = Date.now();
    if (now - cached.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  set(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  size(): number {
    return this.cache.size;
  }
}

// ===========================================================================
// REACT OPTIMIZATION HELPERS
// ===========================================================================

/**
 * Check if two objects are shallowly equal (for React.memo)
 */
export function shallowEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (
    typeof obj1 !== "object" ||
    obj1 === null ||
    typeof obj2 !== "object" ||
    obj2 === null
  ) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (obj1[key] !== obj2[key]) return false;
  }

  return true;
}

/**
 * Create a memoized selector (simple version)
 */
export function createSelector<T, R>(
  selector: (data: T) => R,
  equalityFn: (a: R, b: R) => boolean = shallowEqual
): (data: T) => R {
  let lastInput: T | undefined;
  let lastOutput: R | undefined;

  return (data: T): R => {
    if (lastInput !== undefined && lastOutput !== undefined) {
      const newOutput = selector(data);
      if (equalityFn(lastOutput, newOutput)) {
        return lastOutput;
      }
    }

    lastInput = data;
    lastOutput = selector(data);
    return lastOutput;
  };
}

// ===========================================================================
// EXPORT
// ===========================================================================

export default {
  measurePerformance,
  mark,
  measure,
  clearMarks,
  logRenderPerformance,
  detectSlowRender,
  debounce,
  throttle,
  createLazyLoader,
  preloadImage,
  preloadImages,
  logBundleInfo,
  getMemoryUsage,
  logMemoryUsage,
  monitorApiCall,
  ApiCache,
  shallowEqual,
  createSelector,
};
