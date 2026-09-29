import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv } from "@/infrastructure/supabase/config";

/**
 * Supabase client for Route Handlers (OAuth callback).
 * Attaches auth cookies to the redirect response so sessions survive reloads
 * and server restarts — not only the in-request cookie store.
 */
export function createSupabaseRouteHandlerClient(
  request: NextRequest,
  getRedirectUrl: () => string,
  onResponse: (response: NextResponse) => void,
) {
  const { url, anonKey } = getSupabaseEnv();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        const response = NextResponse.redirect(getRedirectUrl());
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
        onResponse(response);
      },
    },
  });
}
