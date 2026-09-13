import type { NextConfig } from "next";

/**
 * Merchants paste product/logo URLs from any CDN or site.
 * Allow all http(s) hosts; rendering still fails softly via SafeImage if the URL is not a real image.
 */
const nextConfig: NextConfig = {
  // Allow LAN/dev-host HMR when opening the app via network IP (not only localhost).
  allowedDevOrigins: ["192.168.56.1"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
      {
        protocol: "http",
        hostname: "**",
        pathname: "/**",
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
};

export default nextConfig;
