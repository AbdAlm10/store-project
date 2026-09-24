import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { getServices } from "@/infrastructure/container";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (!isSupabaseConfigured() || oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    const services = getServices();
    await services.auth.ensureProfile();
    const stores = await services.stores.listMyStores();
    const next = stores.length > 0 ? "/dashboard" : "/onboarding";
    return NextResponse.redirect(`${origin}${next}`);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
