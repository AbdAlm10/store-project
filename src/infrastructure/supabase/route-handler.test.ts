import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { waitForAuthCookieFlush } from "@/infrastructure/supabase/route-handler";

function client(onAuthStateChange: (callback: (event: string) => unknown) => void) {
  return {
    auth: {
      onAuthStateChange(callback: (event: string) => unknown) {
        onAuthStateChange(callback);
        return { data: { subscription: { unsubscribe() {} } } };
      },
    },
  } as unknown as SupabaseClient;
}

describe("waitForAuthCookieFlush", () => {
  it("resolves when the sign-in event fires and does not await the listener", async () => {
    let listenerResult: unknown = "missing";
    const flushed = waitForAuthCookieFlush(
      client((callback) => {
        listenerResult = callback("INITIAL_SESSION");
        queueMicrotask(() => callback("SIGNED_IN"));
      }),
      1000,
    );
    expect(listenerResult).toBeUndefined();
    await flushed;
  });

  it("resolves on the timeout when the auth event never fires", async () => {
    const started = Date.now();
    await waitForAuthCookieFlush(
      client(() => {}),
      40,
    );
    const elapsed = Date.now() - started;
    expect(elapsed).toBeGreaterThanOrEqual(30);
    expect(elapsed).toBeLessThan(1000);
  });
});
