import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/infrastructure/supabase/config";
import {
  AUTH_STEP_TIMEOUT_MS,
  loginForwardsOAuthCode,
  skipsAuthRefresh,
} from "@/lib/auth-callback";
import { withTimeout } from "@/lib/with-timeout";
import {
  REFERRAL_CODE_PATTERN,
  REFERRAL_COOKIE_NAME,
} from "@/lib/referrals/cookie";

function withReferralCookie(request: NextRequest, response: NextResponse): NextResponse {
  if (request.nextUrl.pathname !== "/register") return response;
  const ref = request.nextUrl.searchParams.get("ref") ?? "";
  if (!REFERRAL_CODE_PATTERN.test(ref)) return response;
  response.cookies.set({
    name: REFERRAL_COOKIE_NAME,
    value: ref,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return response;
}

/**
 * Refresh the session on merchant routes. The public storefront is not matched.
 * OAuth handoff routes skip getUser() so a slow refresh cannot hang /auth/callback.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Supabase misconfigured Site URL sometimes sends ?code= to /login instead of /auth/callback.
  // Only when there is no error — a failure redirect that keeps ?code= would loop.
  if (
    pathname === "/login" &&
    loginForwardsOAuthCode({
      code: request.nextUrl.searchParams.get("code"),
      error: request.nextUrl.searchParams.get("error"),
    })
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return withReferralCookie(request, NextResponse.redirect(callbackUrl));
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (skipsAuthRefresh(pathname) || !isSupabaseConfigured()) {
    return withReferralCookie(request, response);
  }

  const { url, anonKey } = getSupabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const userResult = await withTimeout(
    supabase.auth.getUser(),
    AUTH_STEP_TIMEOUT_MS,
    null,
    "proxy getUser",
  );
  const user = userResult?.data.user ?? null;

  const dashboardPath = pathname.startsWith("/dashboard");
  const allowedWhenExpired =
    pathname === "/dashboard" ||
    pathname === "/dashboard/subscription" ||
    pathname === "/dashboard/settings";

  if (user && dashboardPath && !allowedWhenExpired) {
    const membership = await withTimeout(
      supabase
        .from("store_members")
        .select("store_id")
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle(),
      AUTH_STEP_TIMEOUT_MS,
      null,
      "proxy membership",
    );

    if (membership?.data?.store_id) {
      const subscriptionUsable = await withTimeout(
        supabase.rpc("is_store_subscription_usable", {
          target_store_id: membership.data.store_id,
        }),
        AUTH_STEP_TIMEOUT_MS,
        null,
        "proxy subscription",
      );

      if (subscriptionUsable?.data === false) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard/subscription";
        redirectUrl.search = "locked=1";
        return withReferralCookie(request, NextResponse.redirect(redirectUrl));
      }
    }
  }

  return withReferralCookie(request, response);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/reset-password",
    "/onboarding",
    "/admin/:path*",
    "/auth/google",
    "/auth/callback",
    "/auth/finish",
  ],
};
