/**
 * Supabase is used when URL looks like a real project URL.
 * Misconfigured values (publishable keys pasted as URL) fall back to memory mode.
 * Tests always use memory adapters.
 */
export function isSupabaseConfigured(): boolean {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return false;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";
  return (
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    anon.length > 40
  );
}

export function getSupabaseEnv() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  };
}
