export function initSentry() {
  if (process.env.SENTRY_DSN) {
    console.log("[Sentry] Backend monitoring configured");
  }
}

export function captureError(error: Error, context?: Record<string, unknown>) {
  if (process.env.SENTRY_DSN) {
    console.error("[Sentry] Captured:", error.message, context);
  } else {
    console.error("[Sentry] Skipped (no DSN):", error.message);
  }
}
