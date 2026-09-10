/**
 * Supabase adapters are implemented and selected by `createServices()`
 * when NEXT_PUBLIC_SUPABASE_URL is a real https://*.supabase.co URL.
 */
export { isSupabaseConfigured } from "@/infrastructure/supabase/config";
export { SupabaseAuthProvider } from "@/infrastructure/supabase/auth";
export {
  SupabaseAnalyticsRepository,
  SupabaseCategoryRepository,
  SupabaseProductRepository,
  SupabaseStoreMemberRepository,
  SupabaseStoreRepository,
  SupabaseSubscriptionRepository,
  SupabaseUserRepository,
} from "@/infrastructure/supabase/repositories";
