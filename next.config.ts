import type { NextConfig } from "next";

/**
 * Merchants paste product/logo URLs from any CDN or site.
 * Allow all http(s) hosts; rendering still fails softly via SafeImage if the URL is not a real image.
 */
const nextConfig: NextConfig = {
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
      // Keep client router payloads warm longer → snappier back/forward & Link hops
      dynamic: 60,
      static: 300,
    },
    optimizePackageImports: ["lucide-react"],
  },
};

export default nextConfig;
