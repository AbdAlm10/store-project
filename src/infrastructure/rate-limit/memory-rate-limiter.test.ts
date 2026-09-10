import { describe, expect, it } from "vitest";
import { MemoryRateLimiter } from "@/infrastructure/rate-limit/memory-rate-limiter";

describe("MemoryRateLimiter", () => {
  it("allows requests under the limit and blocks after", async () => {
    const limiter = new MemoryRateLimiter();
    for (let i = 0; i < 10; i += 1) {
      const result = await limiter.check("login", "127.0.0.1");
      expect(result.allowed).toBe(true);
    }
    const blocked = await limiter.check("login", "127.0.0.1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });
});
