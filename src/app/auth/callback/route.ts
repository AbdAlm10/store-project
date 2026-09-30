import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import {
  createSupabaseRouteHandlerClient,
  waitForAuthCookieFlush,
} from "@/infrastructure/supabase/route-handler";

function metaString(
  metadata: Record<string, unknown> | undefined,
  ...keys: string[]
): string | null {
  if (!metadata) return null;
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const flowId = searchParams.get("sb_flow_id");

  if (!isSupabaseConfigured() || oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  try {
    const { supabase, redirectWithAuthCookies } =
      createSupabaseRouteHandlerClient(request);

    const signedIn = waitForAuthCookieFlush(supabase);

    const { data, error } = await supabase.auth.exchangeCodeForSession(
      code,
      flowId ? { flowId } : undefined,
    );
    if (error || !data.session) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    await signedIn;

    const user = data.session.user;
    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        id: user.id,
        email: user.email ?? "",
        full_name: metaString(user.user_metadata, "full_name", "name"),
        avatar_url: metaString(user.user_metadata, "avatar_url", "picture"),
        platform_role: "merchant",
        locale: "ar",
        suspended_at: null,
      },
      { onConflict: "id" },
    );
    if (profileError) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    const { data: memberships } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", user.id)
      .limit(1);

    const nextPath =
      memberships && memberships.length > 0 ? "/dashboard" : "/onboarding";

    return redirectWithAuthCookies(`${origin}${nextPath}`);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
