import type { ThemeId } from "@/domain/types/enums";

export type ThemeTokens = {
  background: string;
  surface: string;
  card: string;
  text: string;
  muted: string;
  border: string;
  accent: string;
  headerFrom: string;
  headerTo: string;
  navBg: string;
  buttonText: string;
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
  "headerFrom",
  "headerTo",
  "navBg",
  "buttonText",
] as const satisfies ReadonlyArray<keyof ThemeTokens>;

export type ThemeColorKey = (typeof THEME_TOKEN_KEYS)[number];

/** Single base look — merchants customize via themeOverrides, not preset themes. */
export const DEFAULT_THEME_TOKENS: ThemeTokens = {
  background: "#F7F4EF",
  surface: "#FFFFFF",
  card: "#FFFFFF",
  text: "#1C241E",
  muted: "#6B746E",
  border: "#EBE0C4",
  accent: "#58A379",
  headerFrom: "#163024",
  headerTo: "#3A7A56",
  navBg: "#FFFFFF",
  buttonText: "#FFFFFF",
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
    "--store-header-from": tokens.headerFrom,
    "--store-header-to": tokens.headerTo,
    "--store-nav": tokens.navBg,
    "--store-button-text": tokens.buttonText,
    "--store-radius": tokens.radius,
    "--store-font-display": tokens.fontDisplay,
    "--store-font-body": tokens.fontBody,
  };
}
