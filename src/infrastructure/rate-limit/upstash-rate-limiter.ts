import {
  MemoryRateLimiter,
  RATE_LIMITS,
  type RateLimitKey,
  type RateLimitResult,
  type RateLimiter,
} from "@/infrastructure/rate-limit/memory-rate-limiter";

type UpstashResult = { result?: number | string | null };

/**
 * Fixed-window limiter over the Upstash Redis REST API.
 * A transport failure falls back to the process-local limiter so login stays up.
 */
export class UpstashRateLimiter implements RateLimiter {
  private readonly fallback = new MemoryRateLimiter();

  constructor(
    private readonly url: string,
    private readonly token: string,
  ) {}

  async check(key: RateLimitKey, identity: string): Promise<RateLimitResult> {
    const config = RATE_LIMITS[key];
    const redisKey = `ys:rl:${key}:${identity.slice(0, 200)}`;
    try {
      const counted = await this.command(["INCR", redisKey]);
      const count = Number(counted);
      let ttl = Number(await this.command(["PTTL", redisKey]));
      if (!Number.isFinite(ttl) || ttl < 0) {
        await this.command(["PEXPIRE", redisKey, String(config.windowMs)]);
        ttl = config.windowMs;
      }
      if (!Number.isFinite(count) || count > config.limit) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterSeconds: Math.max(1, Math.ceil(ttl / 1000)),
        };
      }
      return { allowed: true, remaining: Math.max(0, config.limit - count) };
    } catch {
      return this.fallback.check(key, identity);
    }
  }

  private async command(args: string[]): Promise<number | string | null> {
    const [command, ...rest] = args;
    const path = [command, ...rest.map((part) => encodeURIComponent(part))].join("/");
    const response = await fetch(`${this.url}/${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}` },
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) {
      throw new Error(`Upstash rate limit failed (${response.status})`);
    }
    const body = (await response.json()) as UpstashResult;
    return body.result ?? null;
  }
}
