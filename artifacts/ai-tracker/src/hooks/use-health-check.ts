import { useState, useEffect } from "react";

interface HealthCheckResult {
  isHealthy: boolean;
  isLoading: boolean;
}

export function useHealthCheck(): HealthCheckResult {
  const [isHealthy, setIsHealthy] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function check() {
      try {
        const res = await fetch("/api/healthz");
        if (!mounted) return;
        setIsHealthy(res.ok);
      } catch {
        if (!mounted) return;
        setIsHealthy(false);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    check();

    const interval = setInterval(check, 60_000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return { isHealthy, isLoading };
}
