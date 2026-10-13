import { describe, expect, it, vi } from "vitest";
import { withTimeout } from "@/lib/with-timeout";

describe("withTimeout", () => {
  it("returns the settled value", async () => {
    await expect(withTimeout(Promise.resolve("ok"), 50, "fallback")).resolves.toBe(
      "ok",
    );
  });

  it("returns the fallback when the work rejects", async () => {
    await expect(
      withTimeout(Promise.reject(new Error("nope")), 50, "fallback"),
    ).resolves.toBe("fallback");
  });

  it("returns the fallback when the work never settles", async () => {
    vi.useFakeTimers();
    const pending = withTimeout(new Promise(() => {}), 1500, "fallback", "hung");
    await vi.advanceTimersByTimeAsync(1500);
    await expect(pending).resolves.toBe("fallback");
    vi.useRealTimers();
  });
});
