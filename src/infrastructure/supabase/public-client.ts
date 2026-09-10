import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";

/**
 * Cookie-free Supabase client for public storefront reads.
 * Safe inside unstable_cache (cookies() would force dynamic / break caching).
 */
export function createSupabasePublicClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey || !isSupabaseConfigured()) {
    throw new Error("Supabase is not configured for public reads.");
  }
  return createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
