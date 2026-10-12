type HeaderEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

/**
 * Compatible with the Next.js App Router runtime (inline bootstrap scripts)
 * and the bundled Sentry SDK (connects to ingest over HTTPS).
 * Merchant images are https (or demo data URLs) and are not rewritten by the optimizer.
 */
export function buildContentSecurityPolicy(nodeEnv: string | undefined): string {
  const connectSrc =
    nodeEnv === "production"
      ? "connect-src 'self' https: wss:"
      : "connect-src 'self' https: http: wss: ws:";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    "form-action 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
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
