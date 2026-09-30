import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/infrastructure/supabase/config";

type CookieToSet = {
  name: string;
  value: string;
  options?: Parameters<NextResponse["cookies"]["set"]>[2];
};

/**
 * @supabase/ssr writes session cookies in an async onAuthStateChange handler.
 * Wait until SIGNED_IN so redirectWithAuthCookies includes the session.
 */
export function waitForAuthCookieFlush(
  supabase: SupabaseClient,
  timeoutMs = 5000,
): Promise<void> {
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, timeoutMs);
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_IN") {
        // Let @supabase/ssr finish applyServerStorage (runs on the same event).
        await new Promise<void>((r) => {
          setTimeout(r, 0);
        });
        clearTimeout(timeout);
        subscription.unsubscribe();
        resolve();
      }
    });
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

  const supabase = createServerClient(url, anonKey, {
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
