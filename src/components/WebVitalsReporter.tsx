/**
 * Web Vitals Reporter Component
 *
 * Automatically tracks and reports Web Vitals metrics for the application.
 * Should be included in the root layout.
 */

"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function WebVitalsReporter() {
  const pathname = usePathname();

  useEffect(() => {
    // Only run in browser
    if (typeof window === "undefined") return;

    // Track page views
    const startTime = performance.now();

    // Mark navigation
    if (performance.mark) {
      performance.mark(`page-${pathname}-start`);
    }

    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Mark navigation end
      if (performance.mark && performance.measure) {
        performance.mark(`page-${pathname}-end`);
        try {
          performance.measure(
            `page-${pathname}`,
            `page-${pathname}-start`,
            `page-${pathname}-end`
          );
        } catch (e) {
          // Ignore if marks don't exist
        }
      }
    };
  }, [pathname]);

  useEffect(() => {
    // Import web-vitals dynamically to reduce initial bundle
    import("web-vitals")
      .then((webVitals) => {
        const { onCLS, onFID, onLCP, onFCP, onTTFB, onINP } = webVitals;

        // Track Core Web Vitals
        onCLS((metric) => {
          reportMetric("CLS", metric.value, metric.rating);
        });

        onFID((metric) => {
          reportMetric("FID", metric.value, metric.rating);
        });

        onLCP((metric) => {
          reportMetric("LCP", metric.value, metric.rating);
        });

        onFCP((metric) => {
          reportMetric("FCP", metric.value, metric.rating);
        });

        onTTFB((metric) => {
          reportMetric("TTFB", metric.value, metric.rating);
        });

        onINP((metric) => {
          reportMetric("INP", metric.value, metric.rating);
        });
      })
      .catch((error) => {
      });
  }, []);

  return null;
}

function reportMetric(name: string, value: number, rating: string) {
  // Send to analytics in production
  if (process.env.NODE_ENV === "production") {
    // Send to Google Analytics if available
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", name, {
        value: Math.round(name === "CLS" ? value * 1000 : value),
        event_category: "Web Vitals",
        event_label: rating,
        non_interaction: true,
      });
    }

    // Send to custom analytics endpoint
    if (navigator.sendBeacon) {
      const data = JSON.stringify({
        metric: name,
        value: Math.round(value),
        rating,
        page: window.location.pathname,
        timestamp: Date.now(),
      });

      navigator.sendBeacon("/api/analytics/vitals", data);
    }
  }
}
