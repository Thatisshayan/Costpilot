import { useEffect } from "react";

export function usePagePerformance() {
  useEffect(() => {
    if (typeof window === "undefined" || !window.performance) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (entry.entryType === "navigation") {
          const navEntry = entry as PerformanceNavigationTiming;
          const loadTime = navEntry.loadEventEnd - navEntry.startTime;
          const domReady = navEntry.domContentLoadedEventEnd - navEntry.startTime;
          const ttfb = navEntry.responseStart - navEntry.requestStart;

          if (import.meta.env.DEV) {
            console.log("[Page Performance]", {
              path: window.location.pathname,
              loadTime: `${loadTime.toFixed(0)}ms`,
              domReady: `${domReady.toFixed(0)}ms`,
              ttfb: `${ttfb.toFixed(0)}ms`,
            });
          }
        }
      });
    });

    observer.observe({ type: "navigation", buffered: true });

    return () => observer.disconnect();
  }, []);
}
