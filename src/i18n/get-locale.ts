import { DEFAULT_LOCALE, type Locale } from "@/i18n/config";

/**
 * App is Arabic-only. No cookie read — keeps public routes cacheable.
 */
export async function getRequestLocale(
  _fallback?: string | null,
): Promise<Locale> {
  return DEFAULT_LOCALE;
}
