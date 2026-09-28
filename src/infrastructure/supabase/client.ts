import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/infrastructure/supabase/config";

export function createSupabaseBrowserClient() {
  const { url, anonKey } = getSupabaseEnv();
  return createBrowserClient(url, anonKey);
}
