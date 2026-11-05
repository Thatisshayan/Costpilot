import * as Sentry from "@sentry/react";
export function initSentry() {
  Sentry.init({ dsn: import.meta.env.VITE_SENTRY_DSN, enabled: Boolean(import.meta.env.VITE_SENTRY_DSN),
    sendDefaultPii: false, tracesSampleRate: 0, beforeBreadcrumb: () => null,
    beforeSend(event) { delete event.request; delete event.user; delete event.extra; return event; },
  });
}
export function captureError(error: Error) { Sentry.captureException(error); }
