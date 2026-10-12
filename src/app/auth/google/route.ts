import { NextResponse, type NextRequest } from "next/server";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

/** Starts Google OAuth in a Route Handler so PKCE cookies are set before redirect. */
export async function GET(request: NextRequest) {
  const origin = resolveAllowedAppOrigin(new URL(request.url).origin);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const { supabase, redirectWithAuthCookies } =
    createSupabaseRouteHandlerClient(request);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  return redirectWithAuthCookies(data.url);
}
