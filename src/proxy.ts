import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { isAuthUserVerified, needsEmailVerificationRedirect } from "@/lib/email-verification";
import {
  AUTH_STEP_TIMEOUT_MS,
  loginForwardsOAuthCode,
  skipsAuthRefresh,
} from "@/lib/auth-callback";
import { withTimeout } from "@/lib/with-timeout";
import { isDemoPath } from "@/features/demo/write-guard";
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

  // Public read-only marketing demo. Never refresh a session or call Supabase.
  if (isDemoPath(pathname)) {
    return withReferralCookie(request, NextResponse.next());
  }

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

  if (user && needsEmailVerificationRedirect(pathname, isAuthUserVerified(user))) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/auth/verify";
    redirectUrl.search = "";
    if (user.email) redirectUrl.searchParams.set("email", user.email);
    return withReferralCookie(request, NextResponse.redirect(redirectUrl));
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
    "/auth/verify",
  ],
};
