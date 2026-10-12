import { safeHttpOrigin } from "@/lib/http-url";

/**
 * Public site origin (no path). Used for OAuth redirectTo and metadata.
 */
export function normalizePublicAppOrigin(raw: string | undefined | null): string {
  const trimmed = (raw ?? "").trim();
  if (!trimmed) return "http://localhost:3000";
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return safeHttpOrigin(withScheme) ?? "http://localhost:3000";
}

/** Prefer the incoming request host (Netlify previews, custom domains). */
export function getRequestAppOrigin(
  headerStore: Pick<Headers, "get">,
): string | null {
  const host =
    headerStore.get("x-forwarded-host")?.split(",")[0]?.trim() ??
    headerStore.get("host")?.trim();
  if (!host || host.length > 255) return null;
  const proto =
    headerStore.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? "https";
  if (proto !== "http" && proto !== "https") return null;
  return safeHttpOrigin(`${proto}://${host}`);
}
