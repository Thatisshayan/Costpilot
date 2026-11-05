import * as Sentry from "@sentry/node";

export function initSentry() {
  Sentry.init({ dsn: process.env.SENTRY_DSN, enabled: Boolean(process.env.SENTRY_DSN),
    environment: process.env.NODE_ENV, sendDefaultPii: false, tracesSampleRate: 0,
    beforeBreadcrumb: () => null,
    beforeSend(event) { delete event.request; delete event.user; delete event.extra; return event; },
  });
}
export function captureError(error: Error) { Sentry.captureException(error); }
export function flushMonitoring() { return Sentry.flush(2000); }
