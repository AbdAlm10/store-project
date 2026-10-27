import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { AUTH_STEP_TIMEOUT_MS } from "@/lib/auth-callback";
import { getSupabaseEnv } from "@/infrastructure/supabase/config";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

const COOKIE_FLUSH_EVENTS = new Set([
  "SIGNED_IN",
  "PASSWORD_RECOVERY",
  "TOKEN_REFRESHED",
  "USER_UPDATED",
  "SIGNED_OUT",
]);

/**
 * @supabase/ssr writes session cookies from onAuthStateChange, and auth-js
 * awaits every subscriber before exchangeCodeForSession resolves.
 * The listener must stay synchronous: an async callback that waits for this
 * promise (or for another auth call) deadlocks the exchange and the timeout
 * below never unblocks the route. If the event never arrives, resolve anyway.
 */
export function waitForAuthCookieFlush(
  supabase: SupabaseClient,
  timeoutMs = AUTH_STEP_TIMEOUT_MS,
): Promise<void> {
  return new Promise((resolve) => {
    let settled = false;
    let unsubscribe = () => {};

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        unsubscribe();
      } catch {
        // Listener cleanup must not keep the callback request open.
      }
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);

    try {
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (!COOKIE_FLUSH_EVENTS.has(event)) return;
        // Defer cleanup so unsubscribe is assigned when the client emits
        // the event synchronously inside onAuthStateChange.
        queueMicrotask(finish);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      finish();
    }
  });
}

/**
 * Supabase client for Route Handlers. Collects auth cookies across multiple setAll
 * calls, then attaches them to one redirect response (PKCE uses several cookies).
 */
export function createSupabaseRouteHandlerClient(request: NextRequest): {
  supabase: SupabaseClient;
  redirectWithAuthCookies: (url: string) => NextResponse;
} {
  const { url, anonKey } = getSupabaseEnv();
  const pendingCookies: CookieToSet[] = [];
  const secure = new URL(request.url).protocol === "https:";

  const supabase = createServerClient(url, anonKey, {
    cookieOptions: { secure, sameSite: "lax", path: "/" },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        pendingCookies.push(...cookiesToSet);
      },
    },
  });

  function redirectWithAuthCookies(redirectUrl: string) {
    const response = NextResponse.redirect(redirectUrl);
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  return { supabase, redirectWithAuthCookies };
}
