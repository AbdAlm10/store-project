/**
 * Rate limiting port — implement with Redis/Upstash in production.
 * Keeps abuse controls out of route handlers' business logic.
 */

export type RateLimitKey =
  | "login"
  | "register"
  | "product_create"
  | "upload"
  | "public_api"
  | "analytics"
  | "whatsapp_click";

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds?: number;
};

export interface RateLimiter {
  check(key: RateLimitKey, identity: string): Promise<RateLimitResult>;
}

type Bucket = { count: number; resetAt: number };

const LIMITS: Record<RateLimitKey, { limit: number; windowMs: number }> = {
  login: { limit: 10, windowMs: 60_000 },
  register: { limit: 5, windowMs: 60_000 },
  product_create: { limit: 60, windowMs: 60_000 },
  upload: { limit: 30, windowMs: 60_000 },
  public_api: { limit: 120, windowMs: 60_000 },
  analytics: { limit: 200, windowMs: 60_000 },
  whatsapp_click: { limit: 100, windowMs: 60_000 },
};

export class MemoryRateLimiter implements RateLimiter {
  private readonly buckets = new Map<string, Bucket>();

  async check(key: RateLimitKey, identity: string): Promise<RateLimitResult> {
    const config = LIMITS[key];
    const bucketKey = `${key}:${identity}`;
    const now = Date.now();
    const current = this.buckets.get(bucketKey);

    if (!current || current.resetAt <= now) {
      this.buckets.set(bucketKey, {
        count: 1,
        resetAt: now + config.windowMs,
      });
      return { allowed: true, remaining: config.limit - 1 };
    }

    if (current.count >= config.limit) {
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds: Math.ceil((current.resetAt - now) / 1000),
      };
    }

    current.count += 1;
    this.buckets.set(bucketKey, current);
    return { allowed: true, remaining: config.limit - current.count };
  }
}
