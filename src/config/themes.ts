import type { ThemeId } from "@/domain/types/enums";

export type ThemeTokens = {
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  navBg: string;
  navText: string;
  buttonText: string;
  /** Max height of storefront nav logo (CSS length). Width stays auto. */
  logoSize: string;
  radius: string;
  fontDisplay: string;
  fontBody: string;
};

export const THEME_TOKEN_KEYS = [
  "background",
  "surface",
  "card",
  "text",
  "muted",
  "border",
  "accent",
  "navBg",
  "navText",
  "buttonText",
] as const satisfies ReadonlyArray<keyof ThemeTokens>;

export type ThemeColorKey = (typeof THEME_TOKEN_KEYS)[number];

/** Preset logo max-heights — object-contain keeps aspect ratio (no crop/upscale stretch). */
export const LOGO_SIZE_OPTIONS = [
  { id: "sm", value: "2.25rem", labelKey: "logoSizeSm" as const },
  { id: "md", value: "3rem", labelKey: "logoSizeMd" as const },
  { id: "lg", value: "4rem", labelKey: "logoSizeLg" as const },
  { id: "xl", value: "5rem", labelKey: "logoSizeXl" as const },
] as const;

export type LogoSizeId = (typeof LOGO_SIZE_OPTIONS)[number]["id"];

export function logoSizeIdFromValue(value: string): LogoSizeId {
  const exact = LOGO_SIZE_OPTIONS.find((item) => item.value === value);
  if (exact) return exact.id;
  // Map legacy rem values to nearest preset
  const px = Number.parseFloat(value) * (value.endsWith("rem") ? 16 : 1);
  if (!Number.isFinite(px)) return "md";
  let best: LogoSizeId = "md";
  let bestDist = Infinity;
  for (const option of LOGO_SIZE_OPTIONS) {
    const optionPx = Number.parseFloat(option.value) * 16;
    const dist = Math.abs(optionPx - px);
    if (dist < bestDist) {
      bestDist = dist;
      best = option.id;
    }
  }
  return best;
}

/** Single base look — merchants customize via themeOverrides, not preset themes. */
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  background: "#F7F4EF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1C241E",
  muted: "#6B746E",
  border: "#EBE0C4",
  accent: "#58A379",
  navBg: "#FFFFFF",
  navText: "#1C241E",
  buttonText: "#FFFFFF",
  logoSize: "3rem",
  radius: "1.125rem",
  fontDisplay: "var(--font-arabic), 'IBM Plex Sans Arabic', ui-sans-serif",
  fontBody: "var(--font-arabic), 'IBM Plex Sans Arabic', ui-sans-serif",
};

export type ThemeDefinition = {
  id: ThemeId;
  tokens: ThemeTokens;
};

/** @deprecated Preset themes removed — kept for DB themeId compatibility. */
export const STORE_THEMES: ThemeDefinition[] = [
  { id: "clean", tokens: DEFAULT_THEME_TOKENS },
];

export function getTheme(_id?: ThemeId | null): ThemeDefinition {
  return { id: "clean", tokens: DEFAULT_THEME_TOKENS };
}

export function resolveThemeTokens(
  theme: ThemeDefinition | ThemeTokens = DEFAULT_THEME_TOKENS,
  overrides?: Partial<ThemeTokens> | null,
  primaryColor?: string | null,
): ThemeTokens {
  const base = "tokens" in theme ? theme.tokens : theme;
  const merged: ThemeTokens = {
    ...base,
    ...(overrides ?? {}),
    fontDisplay: DEFAULT_THEME_TOKENS.fontDisplay,
    fontBody: DEFAULT_THEME_TOKENS.fontBody,
  };
  if (primaryColor) {
    merged.accent = primaryColor;
  }
  return merged;
}

export function storefrontCssVars(tokens: ThemeTokens): Record<string, string> {
  return {
    "--store-bg": tokens.background,
    "--store-surface": tokens.surface,
    "--store-card": tokens.card,
    "--store-text": tokens.text,
    "--store-muted": tokens.muted,
    "--store-border": tokens.border,
    "--store-accent": tokens.accent,
    "--store-nav": tokens.navBg,
    "--store-nav-text": tokens.navText,
    "--store-button-text": tokens.buttonText,
    "--store-logo-size": tokens.logoSize,
    "--store-radius": tokens.radius,
    "--store-font-display": tokens.fontDisplay,
    "--store-font-body": tokens.fontBody,
  };
}
