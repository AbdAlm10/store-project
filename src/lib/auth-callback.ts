/** Side-effect budget. Short enough to fall through before Netlify kills the function. */
export const AUTH_STEP_TIMEOUT_MS = 1500;

/**
 * Code exchange is a network round trip and has to succeed to create a session.
 * It is still capped so a stuck auth subscriber cannot hold the function open.
 */
export const AUTH_EXCHANGE_TIMEOUT_MS = 4000;

const POST_AUTH_PATHS = ["/dashboard", "/onboarding"] as const;
export type PostAuthPath = (typeof POST_AUTH_PATHS)[number];

export function oauthFailureUrl(origin: string): string {
  return `${origin}/login?error=oauth`;
}

/**
 * Supabase sometimes returns the PKCE code on /login. Forward it once.
 * A failure redirect must set `error` and drop `code`, or /login and
 * /auth/callback redirect to each other forever.
 */
export function loginForwardsOAuthCode(input: {
  code: string | null;
  error: string | null;
}): boolean {
  return Boolean(input.code) && !input.error;
}

export function postAuthPath(hasStore: boolean): PostAuthPath {
  return hasStore ? "/dashboard" : "/onboarding";
}

/**
 * These routes exchange or start OAuth themselves. A session refresh here
 * runs before the route handler and can hang the function on getUser().
 */
export function skipsAuthRefresh(pathname: string): boolean {
  return pathname === "/auth/callback" || pathname === "/auth/google";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export type AuthUserLike = {
  email_confirmed_at?: string | null;
  app_metadata?: unknown;
  identities?: unknown;
};

export function isGoogleAuthUser(user: AuthUserLike): boolean {
  const metadata = isRecord(user.app_metadata) ? user.app_metadata : null;
  if (metadata?.provider === "google") return true;
  if (Array.isArray(metadata?.providers) && metadata.providers.includes("google")) {
    return true;
  }
  if (!Array.isArray(user.identities)) return false;
  return user.identities.some(
    (identity) => isRecord(identity) && identity.provider === "google",
  );
}

/**
 * Google has already verified the address before it issues an identity.
 * `email_confirmed_at` is sometimes still empty for those users.
 */
export function isEmailVerifiedAuthUser(user: AuthUserLike): boolean {
  if (typeof user.email_confirmed_at === "string" && user.email_confirmed_at.trim()) {
    return true;
  }
  return isGoogleAuthUser(user);
}
