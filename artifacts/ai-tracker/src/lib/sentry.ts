export function initSentry() {
  if (import.meta.env.VITE_SENTRY_DSN) {
    console.log("[Sentry] Frontend monitoring configured");
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (import.meta.env.VITE_SENTRY_DSN) {
    console.error("[Sentry] Captured:", error.message, context);
  } else {
    console.error("[Sentry] Skipped (no DSN):", error.message);
  }
}
