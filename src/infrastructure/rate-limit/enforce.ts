import { headers } from "next/headers";
import { AppError } from "@/domain/errors";
import { clientIpFromHeaders } from "@/lib/analytics/geo";
import {
  MemoryRateLimiter,
  type RateLimitKey,
  type RateLimiter,
} from "@/infrastructure/rate-limit/memory-rate-limiter";
import { UpstashRateLimiter } from "@/infrastructure/rate-limit/upstash-rate-limiter";

const globalLimiter = globalThis as unknown as {
  __ysRateLimiter?: RateLimiter;
};

export function createRateLimiter(
  env: NodeJS.ProcessEnv = process.env,
): RateLimiter {
  const url = env.UPSTASH_REDIS_REST_URL?.trim().replace(/\/+$/, "");
  const token = env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (url && token) return new UpstashRateLimiter(url, token);
  return new MemoryRateLimiter();
}

export function getRateLimiter(): RateLimiter {
  if (!globalLimiter.__ysRateLimiter) {
    globalLimiter.__ysRateLimiter = createRateLimiter();
  }
  return globalLimiter.__ysRateLimiter;
}

export async function requestClientIp(): Promise<string | null> {
  try {
    const headerStore = await headers();
    return clientIpFromHeaders(headerStore);
  } catch {
    return null;
  }
}

export async function enforceRateLimit(
  key: RateLimitKey,
  identity: string,
): Promise<void> {
  const result = await getRateLimiter().check(key, identity.slice(0, 200));
  if (!result.allowed) {
    throw new AppError("RATE_LIMITED", "محاولات كثيرة. حاول مرة أخرى بعد قليل.");
  }
}
