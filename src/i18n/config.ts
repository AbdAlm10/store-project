export const LOCALES = ["ar"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "ar";

export const LOCALE_COOKIE = "ys_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: "العربية",
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && LOCALES.includes(value as Locale);
}

export function isRtl(_locale: Locale = DEFAULT_LOCALE): boolean {
  return true;
}

export function dirFor(_locale: Locale = DEFAULT_LOCALE): "rtl" | "ltr" {
  return "rtl";
}
