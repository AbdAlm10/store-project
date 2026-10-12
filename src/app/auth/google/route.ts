import { NextResponse, type NextRequest } from "next/server";
import { appConfig } from "@/config/app";
import { safeHttpOrigin } from "@/lib/http-url";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

/** Starts Google OAuth in a Route Handler so PKCE cookies are set before redirect. */
export async function GET(request: NextRequest) {
  const origin = safeHttpOrigin(new URL(request.url).origin) ?? appConfig.url;

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
