import { safeHttpOrigin } from "@/lib/http-url";
import { netlifyPreviewAppOrigin } from "@/lib/netlify-app-url";

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

const LOCAL_DEV_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

/**
 * Origins allowed to appear in OAuth redirectTo.
 * Request Host and x-forwarded-host are never consulted.
 */
export function allowedAppOrigins(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  // Direct process.env access is inlined at build. Reading env.NEXT_PUBLIC_APP_URL
  // on the default object would see Netlify's runtime value, which stays production.
  const preview = netlifyPreviewAppOrigin(env);
  const primary = preview
    ? preview
    : env === process.env
      ? normalizePublicAppOrigin(process.env.NEXT_PUBLIC_APP_URL)
      : normalizePublicAppOrigin(env.NEXT_PUBLIC_APP_URL);
  const extras = (env.OAUTH_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => safeHttpOrigin(item.trim()))
    .filter((item): item is string => Boolean(item));
  const origins = new Set<string>([primary, ...extras]);
  if (env.NODE_ENV !== "production") {
    for (const origin of LOCAL_DEV_ORIGINS) origins.add(origin);
  }
  return [...origins];
}

/** Uses the candidate only when it is on the allowlist. */
export function resolveAllowedAppOrigin(
  candidate?: string | null,
  env: NodeJS.ProcessEnv = process.env,
): string {
  const allowed = allowedAppOrigins(env);
  const normalized = candidate ? safeHttpOrigin(candidate) : null;
  if (normalized && allowed.includes(normalized)) return normalized;
  return allowed[0] ?? "http://localhost:3000";
}
