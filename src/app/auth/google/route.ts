import { NextResponse, type NextRequest } from "next/server";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
import { AUTH_EXCHANGE_TIMEOUT_MS, oauthFailureUrl } from "@/lib/auth-callback";
import { withTimeout } from "@/lib/with-timeout";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

/** Next prefetches and RSC flights must not start a second PKCE flow. */
export function isOAuthPrefetch(request: NextRequest): boolean {
  const purpose = request.headers.get("purpose") ?? request.headers.get("sec-purpose");
  if (purpose === "prefetch") return true;
  if (request.headers.get("next-router-prefetch")) return true;
  if (request.headers.get("rsc") === "1") return true;
  return request.nextUrl.searchParams.has("_rsc");
}

/** Starts Google OAuth in a Route Handler so PKCE cookies are set before redirect. */
export async function GET(request: NextRequest) {
  if (isOAuthPrefetch(request)) {
    return new NextResponse(null, { status: 204 });
  }

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
