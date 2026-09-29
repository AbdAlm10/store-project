import { createClient } from "@supabase/supabase-js";
import { AppError } from "@/domain/errors";
import { getSupabaseEnv } from "@/infrastructure/supabase/config";

/**
 * Server-only Supabase client with service role — bypasses RLS for platform admin.
 * Never import this from client components.
 */
export function createSupabaseAdminClient() {
  const { url, serviceRoleKey } = getSupabaseEnv();
  if (!serviceRoleKey) {
    throw new AppError(
      "INTERNAL",
      "Admin dashboard requires SUPABASE_SERVICE_ROLE_KEY on the server.",
    );
  }
  const tokenPayload = serviceRoleKey.split(".")[1];
  if (tokenPayload) {
    try {
      const payload = JSON.parse(
        Buffer.from(tokenPayload, "base64url").toString("utf8"),
      ) as { role?: string };
      if (payload.role === "anon") {
        throw new AppError(
          "INTERNAL",
          "SUPABASE_SERVICE_ROLE_KEY يحتوي على مفتاح anon. استخدم مفتاح service_role من إعدادات API في Supabase.",
        );
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
    }
  }
  return createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
