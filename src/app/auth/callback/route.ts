import { NextResponse, type NextRequest } from "next/server";
import { getServices } from "@/infrastructure/container";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (!isSupabaseConfigured() || oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  let nextPath = "/dashboard";
  let response = NextResponse.redirect(`${origin}${nextPath}`);

  try {
    const supabase = createSupabaseRouteHandlerClient(
      request,
      () => `${origin}${nextPath}`,
      (nextResponse) => {
        response = nextResponse;
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    const services = getServices();
    await services.auth.ensureProfile();
    const stores = await services.stores.listMyStores();
    nextPath = stores.length > 0 ? "/dashboard" : "/onboarding";
    await supabase.auth.getUser();

    const target = `${origin}${nextPath}`;
    if (response.headers.get("location") !== target) {
      const redirected = NextResponse.redirect(target);
      for (const cookie of response.cookies.getAll()) {
        redirected.cookies.set(cookie.name, cookie.value);
      }
      response = redirected;
    }

    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
