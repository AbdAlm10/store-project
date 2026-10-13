import { NextRequest, NextResponse } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_EXCHANGE_TIMEOUT_MS, AUTH_STEP_TIMEOUT_MS } from "@/lib/auth-callback";

const { createSupabaseRouteHandlerClient, attachFromCode } = vi.hoisted(() => ({
  createSupabaseRouteHandlerClient: vi.fn(),
  attachFromCode: vi.fn(async () => undefined),
}));

vi.mock("@/infrastructure/supabase/config", () => ({
  isSupabaseConfigured: () => true,
}));

vi.mock("@/infrastructure/supabase/route-handler", async () => {
  const actual = await vi.importActual<
    typeof import("@/infrastructure/supabase/route-handler")
  >("@/infrastructure/supabase/route-handler");
  return {
    ...actual,
    createSupabaseRouteHandlerClient,
  };
});

vi.mock("@/infrastructure/container", () => ({
  getServices: () => ({
    referrals: { attachFromCode },
  }),
}));

import { GET } from "@/app/auth/callback/route";

type QueryResult = { data: unknown; error: { code?: string } | null };

function scripted(steps: Array<QueryResult | "hang">) {
  let index = 0;
  const next = () => {
    const step = steps[Math.min(index, steps.length - 1)];
    index += 1;
    if (step === "hang") return new Promise<QueryResult>(() => {});
    return Promise.resolve(step);
  };
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: () => chain,
    maybeSingle: () => next(),
    insert: () => next(),
    update: () => ({ eq: () => next() }),
    then: (
      resolve: (value: QueryResult) => unknown,
      reject?: (reason: unknown) => unknown,
    ) => next().then(resolve, reject),
  };
  return chain;
}

function googleUser(emailConfirmedAt: string | null = null) {
  return {
    id: "user-1",
    email: "merchant@gmail.com",
    email_confirmed_at: emailConfirmedAt,
    app_metadata: { provider: "google", providers: ["google"] },
    identities: [{ provider: "google" }],
    user_metadata: { full_name: "Merchant", picture: "https://example.com/a.png" },
  };
}

function installClient(options: {
  exchange: () => Promise<unknown>;
  profiles?: Array<QueryResult | "hang">;
  members?: Array<QueryResult | "hang">;
  signOut?: () => Promise<unknown>;
  emit?: string | null;
}) {
  const signOut = vi.fn(options.signOut ?? (async () => ({ error: null })));
  createSupabaseRouteHandlerClient.mockReturnValue({
    supabase: {
      auth: {
        onAuthStateChange(callback: (event: string) => void) {
          if (options.emit) queueMicrotask(() => callback(options.emit as string));
          return { data: { subscription: { unsubscribe() {} } } };
        },
        exchangeCodeForSession: options.exchange,
        signOut,
      },
      from(table: string) {
        if (table === "profiles") {
          return scripted(options.profiles ?? [{ data: null, error: null }]);
        }
        if (table === "store_members") {
          return scripted(options.members ?? [{ data: [], error: null }]);
        }
        throw new Error(`unexpected table ${table}`);
      },
    },
    redirectWithAuthCookies(url: string) {
      const response = NextResponse.redirect(url);
      response.cookies.set("sb-session", "token");
      return response;
    },
  });
  return { signOut };
}

function callbackRequest(query = "code=pkce-code", cookie?: string) {
  return new NextRequest(`http://localhost:3000/auth/callback?${query}`, {
    headers: cookie ? { cookie } : undefined,
  });
}

function locationOf(response: Response) {
  return new URL(response.headers.get("location") ?? "http://invalid.local/");
}

describe("GET /auth/callback", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("sends Google users without email_confirmed_at to onboarding", async () => {
    installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: { session: { user: googleUser(null) } },
        error: null,
      }),
    });

    const response = await GET(callbackRequest());
    const location = locationOf(response);
    expect(location.pathname).toBe("/onboarding");
    expect(location.searchParams.has("code")).toBe(false);
    expect(response.cookies.get("sb-session")?.value).toBe("token");
  });

  it("sends a merchant who already has a store to the dashboard", async () => {
    installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: {
          session: {
            user: {
              ...googleUser("2026-01-01T00:00:00Z"),
              app_metadata: { provider: "email" },
              identities: [{ provider: "email" }],
            },
          },
        },
        error: null,
      }),
      profiles: [{ data: { id: "user-1", suspended_at: null }, error: null }],
      members: [{ data: [{ store_id: "store-1" }], error: null }],
    });

    const response = await GET(callbackRequest());
    expect(locationOf(response).pathname).toBe("/dashboard");
  });

  it("rejects an unconfirmed password user without keeping the code", async () => {
    installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: {
          session: {
            user: {
              id: "user-2",
              email: "new@shop.test",
              email_confirmed_at: null,
              app_metadata: { provider: "email" },
              identities: [{ provider: "email" }],
              user_metadata: {},
            },
          },
        },
        error: null,
      }),
    });

    const location = locationOf(await GET(callbackRequest()));
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth");
    expect(location.searchParams.has("code")).toBe(false);
  });

  it("signs out a suspended profile and does not loop back into the callback", async () => {
    const { signOut } = installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: { session: { user: googleUser("2026-01-01T00:00:00Z") } },
        error: null,
      }),
      profiles: [
        { data: { id: "user-1", suspended_at: "2026-02-01T00:00:00Z" }, error: null },
      ],
    });

    const location = locationOf(await GET(callbackRequest()));
    expect(signOut).toHaveBeenCalled();
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.get("error")).toBe("oauth");
    expect(location.searchParams.has("code")).toBe(false);
  });

  it("still enters the app when profile writes fail", async () => {
    installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: { session: { user: googleUser() } },
        error: null,
      }),
      profiles: [
        { data: null, error: null },
        { data: null, error: { code: "23505" } },
        { data: null, error: { code: "42501" } },
      ],
    });

    const response = await GET(callbackRequest());
    expect(locationOf(response).pathname).toBe("/onboarding");
  });

  it("falls through when the auth event never fires", async () => {
    vi.useFakeTimers();
    installClient({
      emit: null,
      exchange: async () => ({
        data: { session: { user: googleUser() } },
        error: null,
      }),
    });

    const pending = GET(callbackRequest());
    await vi.advanceTimersByTimeAsync(AUTH_STEP_TIMEOUT_MS);
    const response = await pending;
    expect(locationOf(response).pathname).toBe("/onboarding");
  });

  it("redirects to login when code exchange never settles", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    installClient({
      exchange: () => new Promise(() => {}),
    });

    const pending = GET(callbackRequest());
    await vi.advanceTimersByTimeAsync(AUTH_EXCHANGE_TIMEOUT_MS);
    const location = locationOf(await pending);
    expect(location.pathname).toBe("/login");
    expect(location.searchParams.has("code")).toBe(false);
    expect(location.searchParams.get("error")).toBe("oauth");
  });

  it("does not wait out a hung profile or referral write", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    attachFromCode.mockReturnValue(new Promise(() => {}));
    installClient({
      emit: "SIGNED_IN",
      exchange: async () => ({
        data: { session: { user: googleUser() } },
        error: null,
      }),
      profiles: ["hang"],
      members: ["hang"],
    });

    const pending = GET(
      callbackRequest("code=pkce-code", "ys_ref=abcdefghijklmnop"),
    );
    await vi.advanceTimersByTimeAsync(AUTH_STEP_TIMEOUT_MS * 2);
    const response = await pending;
    expect(locationOf(response).pathname).toBe("/onboarding");
    expect(attachFromCode).toHaveBeenCalled();
  });

  it("drops a callback that has no code or already failed", async () => {
    const missing = locationOf(await GET(callbackRequest("")));
    const failed = locationOf(await GET(callbackRequest("error=access_denied&code=pkce-code")));
    expect(missing.pathname).toBe("/login");
    expect(missing.searchParams.has("code")).toBe(false);
    expect(failed.searchParams.get("error")).toBe("oauth");
    expect(failed.searchParams.has("code")).toBe(false);
    expect(createSupabaseRouteHandlerClient).not.toHaveBeenCalled();
  });
});
