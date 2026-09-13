"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import type { Store } from "@/domain/types/entities";
import {
  DEFAULT_THEME_TOKENS,
  THEME_TOKEN_KEYS,
  type ThemeColorKey,
  type ThemeTokens,
  resolveThemeTokens,
} from "@/config/themes";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { ImageUploadField } from "@/components/media/image-upload-field";
import { updateStoreAction } from "@/features/stores/update-actions";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";

const TOKEN_LABEL_KEYS: Record<ThemeColorKey, MessageKey> = {
  background: "tokenBackground",
  surface: "tokenSurface",
  card: "tokenCard",
  text: "tokenText",
  muted: "tokenMuted",
  border: "tokenBorder",
  accent: "tokenAccent",
  headerFrom: "tokenHeaderFrom",
  headerTo: "tokenHeaderTo",
  navBg: "tokenNav",
  buttonText: "tokenButtonText",
};

export function StoreDesignForm({ store }: { store: Store }) {
  const { t } = useI18n();
  const router = useRouter();
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor);
  const [overrides, setOverrides] = useState<Partial<ThemeTokens>>(
    store.themeOverrides ?? {},
  );
  const [logoUrl, setLogoUrl] = useState(store.logoUrl ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  const preview = useMemo(
    () => resolveThemeTokens(DEFAULT_THEME_TOKENS, overrides, primaryColor),
    [overrides, primaryColor],
  );

  function setToken(key: ThemeColorKey, value: string) {
    setOverrides((prev) => ({ ...prev, [key]: value }));
    if (key === "accent") setPrimaryColor(value);
  }

  function resetOverrides() {
    setOverrides({});
    setPrimaryColor(DEFAULT_THEME_TOKENS.accent);
  }

  return (
    <form
      className="space-y-8"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const cleaned = Object.fromEntries(
            Object.entries(overrides).filter(
              ([, value]) => typeof value === "string" && value.length > 0,
            ),
          ) as Partial<ThemeTokens>;
          const result = await updateStoreAction(store.id, {
            themeId: "clean",
            primaryColor,
            themeOverrides: Object.keys(cleaned).length ? cleaned : null,
            logoUrl: logoUrl || null,
            coverUrl: null,
          });
          if (!result.ok) {
            setError(result.error);
            return;
          }
          setSaved(true);
          router.refresh();
        });
      }}
    >
      <section
        className="rounded-3xl p-6"
        style={
          {
            background: preview.surface,
            color: preview.text,
            boxShadow: `inset 0 0 0 1px ${preview.border}`,
            fontFamily: preview.fontBody,
          } as React.CSSProperties
        }
      >
        <h2 className="text-lg font-semibold">{t("livePreview")}</h2>
        <p className="mt-1 text-sm opacity-70">{t("livePreviewHint")}</p>
        <div
          className="mt-4 overflow-hidden"
          style={{
            background: preview.background,
            borderRadius: preview.radius,
          }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{
              background: preview.navBg,
              color: preview.text,
              borderBottom: `1px solid ${preview.border}`,
            }}
          >
            <div
              className="flex h-9 w-9 items-center justify-center text-sm font-bold"
              style={{
                background: preview.accent,
                color: preview.buttonText,
                borderRadius: `calc(${preview.radius} * 0.55)`,
              }}
            >
              {store.name.slice(0, 1)}
            </div>
            <span style={{ fontFamily: preview.fontDisplay }}>{store.name}</span>
          </div>
          <div
            className="h-16"
            style={{
              background: `linear-gradient(135deg, ${preview.headerFrom}, ${preview.headerTo})`,
            }}
          />
          <div className="grid grid-cols-3 gap-2 p-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="p-2"
                style={{
                  background: preview.card,
                  boxShadow: `inset 0 0 0 1px ${preview.border}`,
                  borderRadius: `calc(${preview.radius} * 0.7)`,
                }}
              >
                <div
                  className="mb-2 aspect-square"
                  style={{
                    background: `${preview.accent}33`,
                    borderRadius: `calc(${preview.radius} * 0.45)`,
                  }}
                />
                <div
                  className="h-2 rounded"
                  style={{ background: preview.border }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              {t("colorCustomization")}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("colorCustomizationHint")}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetOverrides}>
            {t("resetColors")}
          </Button>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {THEME_TOKEN_KEYS.map((key) => {
            const value = preview[key];
            return (
              <div key={key}>
                <Label htmlFor={`token-${key}`}>{t(TOKEN_LABEL_KEYS[key])}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`token-${key}`}
                    type="color"
                    value={normalizeHex(value)}
                    onChange={(event) => setToken(key, event.target.value)}
                    className="h-11 w-14 p-1"
                  />
                  <Input
                    value={value}
                    onChange={(event) => setToken(key, event.target.value)}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]">
        <h2 className="text-lg font-semibold text-slate-900">{t("branding")}</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="primaryColor">{t("primaryColor")}</Label>
            <div className="flex items-center gap-3">
              <Input
                id="primaryColor"
                type="color"
                value={normalizeHex(primaryColor)}
                onChange={(event) => {
                  setPrimaryColor(event.target.value);
                  setOverrides((prev) => ({
                    ...prev,
                    accent: event.target.value,
                  }));
                }}
                className="h-11 w-16 p-1"
              />
              <Input
                value={primaryColor}
                onChange={(event) => {
                  setPrimaryColor(event.target.value);
                  setOverrides((prev) => ({
                    ...prev,
                    accent: event.target.value,
                  }));
                }}
                pattern="^#[0-9A-Fa-f]{6}$"
              />
            </div>
          </div>
          <div>
            <Label>{t("logoUrl")}</Label>
            <ImageUploadField
              storeId={store.id}
              kind="logo"
              name="logoUrl"
              value={logoUrl}
              onChange={setLogoUrl}
            />
            <p className="mt-1 text-xs text-slate-500">{t("logoNavHint")}</p>
          </div>
        </div>
      </section>

      {error ? (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="text-sm text-brand-700" role="status">
          {t("designSaved")}
        </p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? t("saving") : t("saveDesign")}
      </Button>
    </form>
  );
}

function normalizeHex(value: string): string {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : "#000000";
}
