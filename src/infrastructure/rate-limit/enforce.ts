import { headers } from "next/headers";
import { AppError } from "@/domain/errors";
import { clientIpFromHeaders } from "@/lib/analytics/geo";
import {
  MemoryRateLimiter,
  type RateLimitKey,
} from "@/infrastructure/rate-limit/memory-rate-limiter";

const globalLimiter = globalThis as unknown as {
  __ysRateLimiter?: MemoryRateLimiter;
};

export function getRateLimiter(): MemoryRateLimiter {
  if (!globalLimiter.__ysRateLimiter) {
    globalLimiter.__ysRateLimiter = new MemoryRateLimiter();
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
