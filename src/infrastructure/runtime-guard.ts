import { isSupabaseConfigured } from "@/infrastructure/supabase/config";

/**
 * Production must talk to Supabase. The in-memory demo stays available for
 * local development, tests, and an explicit production opt-in.
 * `next build` sets NODE_ENV=production while collecting pages, so the guard
 * skips that phase and the app can still compile without secrets.
 */
export function assertProductionDataPlane(): void {
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") return;
  if (process.env.NODE_ENV !== "production") return;
  if (isSupabaseConfigured()) return;
  if (process.env.ENABLE_DEMO_MODE === "true") return;
  throw new Error(
    "Refusing to start: production requires SUPABASE_URL and SUPABASE_ANON_KEY. Set ENABLE_DEMO_MODE=true only for an intentional in-memory demo.",
  );
}
