import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { AppError } from "@/domain/errors";
import { getSupabaseEnv, isSupabaseConfigured } from "@/infrastructure/supabase/config";

export async function createSupabaseServerClient() {
  if (!isSupabaseConfigured()) {
    throw new AppError(
      "INTERNAL",
      "إعدادات المصادقة غير مكتملة. حاول لاحقًا.",
    );
  }
  const { url, anonKey } = getSupabaseEnv();

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware/proxy will refresh sessions.
        }
      },
    },
  });
}
