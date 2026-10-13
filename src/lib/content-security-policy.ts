type HeaderEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

/**
 * Next.js writes inline bootstrap scripts into every page. A nonce has to be
 * generated per request, which forces the whole app to render dynamically, so
 * production keeps 'unsafe-inline' for those framework scripts and does not
 * allow 'unsafe-eval'. React's dev refresh runtime still needs 'unsafe-eval'.
 * Sentry ingest is HTTPS. Merchant images are https or demo data URLs.
 */
export function buildContentSecurityPolicy(nodeEnv: string | undefined): string {
  const connectSrc =
    nodeEnv === "production"
      ? "connect-src 'self' https: wss:"
      : "connect-src 'self' https: http: wss: ws:";
  const scriptSrc =
    nodeEnv === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "worker-src 'self' blob:",
    connectSrc,
  ].join("; ");
}

export function buildSecurityHeaders(
  env: HeaderEnv,
): Array<{ key: string; value: string }> {
  const headers: Array<{ key: string; value: string }> = [
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "X-Frame-Options", value: "SAMEORIGIN" },
    {
      key: "Permissions-Policy",
      value: "camera=(), microphone=(), geolocation=()",
    },
    {
      key: "Content-Security-Policy",
      value: buildContentSecurityPolicy(env.NODE_ENV),
    },
  ];
  const appUrl = env.NEXT_PUBLIC_APP_URL ?? "";
  if (env.NODE_ENV === "production" && appUrl.startsWith("https://")) {
    headers.push({
      key: "Strict-Transport-Security",
      value: "max-age=63072000",
    });
  }
  return headers;
}
