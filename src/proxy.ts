import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseEnv, isSupabaseConfigured } from "@/infrastructure/supabase/config";

/**
 * Only refresh auth on merchant/admin routes.
 * Public storefront skips this — major latency win.
 */
export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Supabase misconfigured Site URL sometimes sends ?code= to /login instead of /auth/callback.
  if (
    pathname === "/login" &&
    request.nextUrl.searchParams.has("code") &&
    !request.nextUrl.searchParams.has("error")
  ) {
    const callbackUrl = request.nextUrl.clone();
    callbackUrl.pathname = "/auth/callback";
    return NextResponse.redirect(callbackUrl);
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  if (!isSupabaseConfigured()) {
    return response;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dashboardPath = pathname.startsWith("/dashboard");
  const allowedWhenExpired =
    pathname === "/dashboard" ||
    pathname === "/dashboard/subscription" ||
    pathname === "/dashboard/settings";

  if (user && dashboardPath && !allowedWhenExpired) {
    const { data: membership } = await supabase
      .from("store_members")
      .select("store_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (membership?.store_id) {
      const { data: subscriptionUsable } = await supabase.rpc(
        "is_store_subscription_usable",
        { target_store_id: membership.store_id },
      );

      if (subscriptionUsable === false) {
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = "/dashboard/subscription";
        redirectUrl.search = "locked=1";
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register",
    "/reset-password",
    "/onboarding",
    "/admin/:path*",
    "/auth/callback",
  ],
};
