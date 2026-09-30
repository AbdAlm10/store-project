/** Shared Sentry init options for client, server, and edge runtimes. */
export const sentryInitOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "development" ? 1.0 : 0.1,
} as const;
