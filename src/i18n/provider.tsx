"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/messages";

type Translate = (
  key: MessageKey,
  vars?: Record<string, string | number>,
) => string;

type I18nContextValue = {
  locale: Locale;
  t: Translate;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({
      locale,
      t: createTranslator(locale),
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
