import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv, isSupabaseConfigured } from "@/infrastructure/supabase/config";

/**
 * Cookie-free Supabase client for public storefront reads.
 * Safe inside unstable_cache (cookies() would force dynamic / break caching).
 */
export function createSupabasePublicClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for public reads.");
  }
  const { url, anonKey } = getSupabaseEnv();
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
