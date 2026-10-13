import { NextResponse, type NextRequest } from "next/server";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
import { AUTH_EXCHANGE_TIMEOUT_MS, oauthFailureUrl } from "@/lib/auth-callback";
import { withTimeout } from "@/lib/with-timeout";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

/** Starts Google OAuth in a Route Handler so PKCE cookies are set before redirect. */
export async function GET(request: NextRequest) {
  const origin = resolveAllowedAppOrigin(new URL(request.url).origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(oauthFailureUrl(origin));
  }

  const { supabase, redirectWithAuthCookies } =
    createSupabaseRouteHandlerClient(request);

  const started = await withTimeout(
    supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    }),
    AUTH_EXCHANGE_TIMEOUT_MS,
    null,
    "google oauth start",
  );

  if (!started || started.error || !started.data.url) {
    return NextResponse.redirect(oauthFailureUrl(origin));
  }

  return redirectWithAuthCookies(started.data.url);
}
