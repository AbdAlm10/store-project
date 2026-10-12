import { NextResponse, type NextRequest } from "next/server";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
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
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = resolveAllowedAppOrigin(requestUrl.origin);
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
    const profilePatch = {
      email: user.email ?? "",
      full_name: metaString(user.user_metadata, "full_name", "name"),
      avatar_url: metaString(user.user_metadata, "avatar_url", "picture"),
    };
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id, suspended_at")
      .eq("id", user.id)
      .maybeSingle();

    if (existingProfile?.suspended_at) {
      await supabase.auth.signOut();
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    let profileError = existingProfile
      ? (
          await supabase.from("profiles").update(profilePatch).eq("id", user.id)
        ).error
      : (
          await supabase.from("profiles").insert({
            id: user.id,
            ...profilePatch,
            platform_role: "merchant",
            locale: "ar",
            suspended_at: null,
          })
        ).error;
    if (profileError?.code === "23505") {
      profileError = (
        await supabase.from("profiles").update(profilePatch).eq("id", user.id)
      ).error;
    }
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
