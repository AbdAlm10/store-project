/**
 * Path segments owned by the app. A store slug must not take these,
 * or `/{slug}` would shadow a real route (or look like a missing store).
 */
export const RESERVED_STORE_SLUGS = [
  "admin",
  "api",
  "app",
  "assets",
  "auth",
  "billing",
  "brand",
  "callback",
  "dashboard",
  "demo",
  "examples",
  "explore",
  "favicon",
  "features",
  "help",
  "home",
  "icon",
  "icons",
  "login",
  "logout",
  "marketing",
  "onboarding",
  "pricing",
  "privacy",
  "public",
  "register",
  "reset-password",
  "robots",
  "settings",
  "sign-in",
  "sign-up",
  "signin",
  "signup",
  "sitemap",
  "static",
  "subscription",
  "support",
  "terms",
  "www",
] as const;

const RESERVED = new Set<string>(RESERVED_STORE_SLUGS);

export function isReservedStoreSlug(slug: string): boolean {
  return RESERVED.has(slug.trim().toLowerCase());
}
