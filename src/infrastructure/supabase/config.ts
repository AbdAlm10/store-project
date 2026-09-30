/**
 * Dashboard "REST URL" copies include `/rest/v1`. Auth and the JS client need
 * the project origin only (`https://xxxx.supabase.co`).
 */
export function normalizeSupabaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

/**
 * Supabase is used when URL looks like a real project URL.
 * Misconfigured values (publishable keys pasted as URL) fall back to memory mode.
 * Tests always use memory adapters.
 */
export function isSupabaseConfigured(): boolean {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return false;
  }
  const url = normalizeSupabaseUrl(process.env.SUPABASE_URL ?? "");
  const anon = process.env.SUPABASE_ANON_KEY?.trim() ?? "";
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
    url: normalizeSupabaseUrl(process.env.SUPABASE_URL ?? ""),
    anonKey: process.env.SUPABASE_ANON_KEY!.trim(),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  };
}

export function isSupabaseServiceRoleConfigured(): boolean {
  if (!isSupabaseConfigured()) return true;
  return Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
