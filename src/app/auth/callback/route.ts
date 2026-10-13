import { NextResponse, type NextRequest } from "next/server";
import { resolveAllowedAppOrigin } from "@/lib/app-origin";
import {
  AUTH_EXCHANGE_TIMEOUT_MS,
  AUTH_STEP_TIMEOUT_MS,
  isEmailVerifiedAuthUser,
  oauthFailureUrl,
  postAuthPath,
} from "@/lib/auth-callback";
import { withTimeout } from "@/lib/with-timeout";
import { getServices } from "@/infrastructure/container";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { REFERRAL_COOKIE_NAME } from "@/lib/referrals/cookie";
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

type RouteClient = ReturnType<
  typeof createSupabaseRouteHandlerClient
>["supabase"];

type OAuthUser = {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
};

type ProfileSync = "ok" | "suspended" | "skipped";

async function syncOAuthProfile(
  supabase: RouteClient,
  user: OAuthUser,
): Promise<ProfileSync> {
  const profilePatch = {
    email: user.email ?? "",
    full_name: metaString(user.user_metadata, "full_name", "name"),
    avatar_url: metaString(user.user_metadata, "avatar_url", "picture"),
  };
  const read = await supabase
    .from("profiles")
    .select("id, suspended_at")
    .eq("id", user.id)
    .maybeSingle();
  if (read.error) {
    console.error("oauth profile read failed", read.error.code);
  }
  if (read.data?.suspended_at) return "suspended";

  const write = read.data
    ? await supabase.from("profiles").update(profilePatch).eq("id", user.id)
    : await supabase.from("profiles").insert({
        id: user.id,
        ...profilePatch,
        platform_role: "merchant",
        locale: "ar",
        suspended_at: null,
      });

  let error = write.error;
  if (error?.code === "23505") {
    error = (
      await supabase.from("profiles").update(profilePatch).eq("id", user.id)
    ).error;
  }
  if (error) {
    console.error("oauth profile write failed", error.code);
    return "skipped";
  }
  return "ok";
}

async function hasStoreMembership(
  supabase: RouteClient,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("store_members")
    .select("store_id")
    .eq("user_id", userId)
    .limit(1);
  if (error) {
    console.error("oauth membership read failed", error.code);
    return false;
  }
  return Boolean(data && data.length > 0);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = resolveAllowedAppOrigin(requestUrl.origin);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");
  const flowId = searchParams.get("sb_flow_id");

  if (!isSupabaseConfigured() || oauthError || !code) {
    return NextResponse.redirect(oauthFailureUrl(origin));
  }

  try {
    const { supabase, redirectWithAuthCookies } =
      createSupabaseRouteHandlerClient(request);

    const signedIn = waitForAuthCookieFlush(supabase, AUTH_STEP_TIMEOUT_MS);

    const exchanged = await withTimeout(
      supabase.auth.exchangeCodeForSession(
        code,
        flowId ? { flowId } : undefined,
      ),
      AUTH_EXCHANGE_TIMEOUT_MS,
      null,
      "oauth code exchange",
    );
    if (!exchanged || exchanged.error || !exchanged.data.session) {
      return NextResponse.redirect(oauthFailureUrl(origin));
    }

    // Cookies are usually written before exchange resolves. If the auth
    // event never fires, continue with whatever setAll already recorded.
    await signedIn;

    const user = exchanged.data.session.user;
    // Google users are verified by the identity provider even when
    // email_confirmed_at is still empty. Do not send them back to /login.
    if (!isEmailVerifiedAuthUser(user)) {
      return NextResponse.redirect(oauthFailureUrl(origin));
    }

    const ref = request.cookies.get(REFERRAL_COOKIE_NAME)?.value;
    const [profileStatus, hasStore] = await Promise.all([
      withTimeout(
        syncOAuthProfile(supabase, user),
        AUTH_STEP_TIMEOUT_MS,
        "skipped" as const,
        "oauth profile sync",
      ),
      withTimeout(
        hasStoreMembership(supabase, user.id),
        AUTH_STEP_TIMEOUT_MS,
        false,
        "oauth membership read",
      ),
    ]);

    if (profileStatus === "suspended") {
      await withTimeout(
        supabase.auth.signOut().then(() => undefined),
        AUTH_STEP_TIMEOUT_MS,
        undefined,
        "oauth sign out",
      );
      return redirectWithAuthCookies(oauthFailureUrl(origin));
    }

    if (ref) {
      await withTimeout(
        getServices()
          .referrals.attachFromCode(user.id, ref)
          .catch((error: unknown) => {
            console.error("referral attach failed", error);
          }),
        AUTH_STEP_TIMEOUT_MS,
        undefined,
        "oauth referral attach",
      );
    }

    // Unknown membership lands on onboarding, which sends merchants who
    // already have a store to the dashboard. That is one hop, not a loop.
    const nextPath = postAuthPath(profileStatus === "ok" && hasStore);
    const response = redirectWithAuthCookies(`${origin}${nextPath}`);
    if (ref) response.cookies.delete(REFERRAL_COOKIE_NAME);
    return response;
  } catch (error) {
    console.error("oauth callback failed", error);
    return NextResponse.redirect(oauthFailureUrl(origin));
  }
}
