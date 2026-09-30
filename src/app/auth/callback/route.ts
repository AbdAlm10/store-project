import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseRouteHandlerClient } from "@/infrastructure/supabase/route-handler";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const oauthError = searchParams.get("error");

  if (!isSupabaseConfigured() || oauthError || !code) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const finishPath = "/auth/finish";
  let response = NextResponse.redirect(`${origin}${finishPath}`);

  try {
    const supabase = createSupabaseRouteHandlerClient(
      request,
      () => `${origin}${finishPath}`,
      (nextResponse) => {
        response = nextResponse;
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }

    return response;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
}
