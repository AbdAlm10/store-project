import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AUTH_STEP_TIMEOUT_MS } from "@/lib/auth-callback";

const { createServerClient } = vi.hoisted(() => ({
  createServerClient: vi.fn(),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

vi.mock("@/infrastructure/supabase/config", () => ({
  isSupabaseConfigured: () => true,
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    anonKey: "x".repeat(48),
  }),
}));

import { proxy } from "@/proxy";

function hanging() {
  const never = new Promise(() => {});
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: () => never,
    then: () => never,
  };
  return chain;
}

describe("auth proxy", () => {
  beforeEach(() => {
    createServerClient.mockReset();
    createServerClient.mockReturnValue({
      auth: {
        getUser: () => new Promise(() => {}),
      },
      from: () => hanging(),
      rpc: () => new Promise(() => {}),
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("forwards a login code to the callback and ignores a failure bounce", async () => {
    const forwarded = await proxy(
      new NextRequest("http://localhost:3000/login?code=pkce-code"),
    );
    expect(forwarded.headers.get("location")).toBe(
      "http://localhost:3000/auth/callback?code=pkce-code",
    );
    expect(createServerClient).not.toHaveBeenCalled();

    createServerClient.mockReturnValue({
      auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
      },
    });
    const failed = await proxy(
      new NextRequest("http://localhost:3000/login?error=oauth&code=pkce-code"),
    );
    expect(failed.headers.get("location")).toBeNull();
  });

  it("does not refresh the session on the OAuth callback", async () => {
    const response = await proxy(
      new NextRequest("http://localhost:3000/auth/callback?code=pkce-code"),
    );
    expect(response.headers.get("location")).toBeNull();
    expect(createServerClient).not.toHaveBeenCalled();
  });

  it("continues when getUser never returns", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const pending = proxy(new NextRequest("http://localhost:3000/dashboard/products"));
    await vi.advanceTimersByTimeAsync(AUTH_STEP_TIMEOUT_MS);
    const response = await pending;
    expect(response.headers.get("location")).toBeNull();
  });

  it("sends an unconfirmed email user to the OTP page before onboarding", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user-1",
              email: "new@shop.test",
              email_confirmed_at: null,
              app_metadata: { provider: "email" },
              identities: [{ provider: "email" }],
            },
          },
          error: null,
        }),
      },
    });

    const response = await proxy(new NextRequest("http://localhost:3000/onboarding"));
    const location = new URL(response.headers.get("location") ?? "http://invalid.local/");
    expect(location.pathname).toBe("/auth/verify");
    expect(location.searchParams.get("email")).toBe("new@shop.test");
  });

  it("does not send a Google user from onboarding to the OTP page", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: async () => ({
          data: {
            user: {
              id: "user-1",
              email: "merchant@gmail.com",
              email_confirmed_at: null,
              app_metadata: { provider: "google", providers: ["google"] },
              identities: [{ provider: "google" }],
            },
          },
          error: null,
        }),
      },
    });

    const response = await proxy(new NextRequest("http://localhost:3000/onboarding"));
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not lock the dashboard when the subscription is no longer usable", async () => {
    createServerClient.mockReturnValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1", email_confirmed_at: "2026-01-01T00:00:00Z" } },
          error: null,
        }),
      },
      from: () => ({
        select: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => ({
                data: { store_id: "store-1" },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async () => ({ data: false, error: null }),
    });

    const response = await proxy(
      new NextRequest("http://localhost:3000/dashboard/products"),
    );
    expect(response.headers.get("location")).toBeNull();
  });

  it("does not lock the dashboard when the subscription check hangs", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    createServerClient.mockReturnValue({
      auth: {
        getUser: async () => ({
          data: { user: { id: "user-1", email_confirmed_at: "2026-01-01T00:00:00Z" } },
          error: null,
        }),
      },
      from: () => hanging(),
      rpc: () => new Promise(() => {}),
    });

    const pending = proxy(new NextRequest("http://localhost:3000/dashboard/products"));
    await vi.advanceTimersByTimeAsync(AUTH_STEP_TIMEOUT_MS);
    const response = await pending;
    expect(response.headers.get("location")).toBeNull();
  });
});
