import { safeHttpOrigin } from "./http-url";

type HeaderEnv = {
  NODE_ENV?: string;
  NEXT_PUBLIC_APP_URL?: string;
};

/** Allow posts to the baked site origin as well as the document origin. */
function formActionDirective(appUrl: string | undefined): string {
  const origin = safeHttpOrigin(appUrl);
  if (origin?.startsWith("https://")) return `form-action 'self' ${origin}`;
  return "form-action 'self'";
}

/**
 * Next.js writes inline bootstrap scripts into every page. A nonce has to be
 * generated per request, which forces the whole app to render dynamically, so
 * production keeps 'unsafe-inline' for those framework scripts and does not
 * allow 'unsafe-eval'. React's dev refresh runtime still needs 'unsafe-eval'.
 * Sentry ingest is HTTPS. Merchant images are https or demo data URLs.
 * Cloudflare Web Analytics loads beacon.min.js and posts the beacon to
 * cloudflareinsights.com.
 */
export function buildContentSecurityPolicy(
  nodeEnv: string | undefined,
  appUrl?: string,
): string {
  const connectSrc =
    nodeEnv === "production"
      ? "connect-src 'self' https: wss: https://cloudflareinsights.com"
      : "connect-src 'self' https: http: wss: ws: https://cloudflareinsights.com";
  const scriptSrc =
    nodeEnv === "development"
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com"
      : "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'self'",
    formActionDirective(appUrl),
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
      value: buildContentSecurityPolicy(env.NODE_ENV, env.NEXT_PUBLIC_APP_URL),
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
