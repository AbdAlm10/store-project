/**
 * Public site origin (no path). Used for OAuth redirectTo and metadata.
 */
export function normalizePublicAppOrigin(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "http://localhost:3000";
  try {
    const parsed = new URL(trimmed);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return trimmed.replace(/\/+$/, "");
  }
}

/** Prefer the incoming request host (Netlify previews, custom domains). */
export function getRequestAppOrigin(
  headerStore: Pick<Headers, "get">,
): string | null {
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headerStore.get("host")?.trim();
  if (!host) return null;
  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  return `${proto}://${host}`;
}
