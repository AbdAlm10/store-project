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
 * Supabase client for Route Handlers. Collects auth cookies across multiple setAll
 * calls, then attaches them to one redirect response (PKCE uses several cookies).
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
): { supabase: SupabaseClient; redirectWithAuthCookies: (url: string) => NextResponse } {
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
