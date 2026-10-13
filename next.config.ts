import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import { buildSecurityHeaders } from "./src/lib/content-security-policy";

/**
 * Merchant photos render through SafeImage with `unoptimized`, so the browser
 * loads those https URLs directly and the image optimizer never fetches them.
 * The optimizer allowlist is https-only and names real hosts. A hostname of
 * "**" would also match private IPs, so it is not used.
 */
const nextConfig: NextConfig = {
  // localhost is allowed by Next itself. 127.0.0.1 is not, and a blocked dev
  // websocket prevents the client runtime from hydrating.
  allowedDevOrigins: ["127.0.0.1", "192.168.5.8", "192.168.56.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    staleTimes: {
      // Dashboard tabs: keep RSC payloads in the client router cache for a long time.
      // Volatile metrics soft-refresh separately (~10m) without reloading the page shell.
      dynamic: 86_400, // 24h
      static: 86_400,
    },
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: buildSecurityHeaders(process.env),
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: "dukkan-z0",
  project: "dukkan",
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
});
