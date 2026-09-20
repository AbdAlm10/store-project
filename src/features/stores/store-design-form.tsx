"use client";

import { ImageUploadField } from "@/components/media/image-upload-field";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/forms";
import { SafeImage } from "@/components/ui/safe-image";
import {
  DEFAULT_THEME_TOKENS,
  LOGO_SIZE_OPTIONS,
  THEME_TOKEN_KEYS,
  logoSizeIdFromValue,
  resolveThemeTokens,
  type ThemeColorKey,
  type ThemeTokens,
} from "@/config/themes";
import { BASIC_THEME_COLOR_KEYS } from "@/config/plans";
import type { Store } from "@/domain/types/entities";
import { updateStoreAction } from "@/features/stores/update-actions";
import type { MessageKey } from "@/i18n/messages";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

const TOKEN_LABEL_KEYS: Record<ThemeColorKey, MessageKey> = {
  background: "tokenBackground",
  surface: "tokenSurface",
  card: "tokenCard",
  text: "tokenText",
  muted: "tokenMuted",
  border: "tokenBorder",
  accent: "tokenAccent",
  navBg: "tokenNav",
  navText: "tokenNavText",
  buttonText: "tokenButtonText",
};

export function StoreDesignForm({
  store,
  fullThemeCustomization = false,
}: {
  store: Store;
  fullThemeCustomization?: boolean;
}) {
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

  const logoSizeId = logoSizeIdFromValue(preview.logoSize);

  return (
    <form
      className="min-w-0 max-w-full space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const cleaned = Object.fromEntries(
            Object.entries(overrides).filter(
              ([, value]) => typeof value === "string" && value.length > 0,
            ),
          ) as import("@/config/themes").ThemeOverrides;
          const navbarActions = store.themeOverrides?.navbarActions;
          if (navbarActions) cleaned.navbarActions = navbarActions;
          if (store.themeOverrides?.qrStandColor) {
            cleaned.qrStandColor = store.themeOverrides.qrStandColor;
          }
          if (store.themeOverrides?.qrLogoBg) {
            cleaned.qrLogoBg = store.themeOverrides.qrLogoBg;
          }
          const result = await updateStoreAction(store.id, {
            themeId: "clean",
            primaryColor,
            themeOverrides: Object.keys(cleaned).length ? cleaned : null,
            logoUrl: logoUrl || null,
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
        className="min-w-0 max-w-full overflow-hidden rounded-2xl p-4"
        style={
          {
            background: preview.surface,
            color: preview.text,
            boxShadow: `inset 0 0 0 1px ${preview.border}`,
            fontFamily: preview.fontBody,
          } as React.CSSProperties
        }
      >
        <h2 className="text-base font-semibold">{t("livePreview")}</h2>
        <p className="mt-0.5 text-xs opacity-70">{t("livePreviewHint")}</p>
        <div
          className="mt-3 overflow-hidden"
          style={{
            background: preview.background,
            borderRadius: preview.radius,
          }}
        >
          <div
            className="flex items-center gap-3 px-3 py-2.5"
            style={{
              background: preview.navBg,
              color: preview.navText,
              borderBottom: `1px solid ${preview.border}`,
            }}
          >
            {logoUrl ? (
              <SafeImage
                src={logoUrl}
                alt=""
                width={240}
                height={80}
                className="w-auto max-w-[16rem] object-contain object-start"
                style={{
                  height: preview.logoSize,
                  maxHeight: preview.logoSize,
                }}
              />
            ) : (
              <div
                className="flex items-center justify-center text-sm font-bold"
                style={{
                  height: preview.logoSize,
                  width: preview.logoSize,
                  background: preview.accent,
                  color: preview.buttonText,
                  borderRadius: `calc(${preview.radius} * 0.55)`,
                }}
              >
                {store.name.slice(0, 1)}
              </div>
            )}
            <span style={{ fontFamily: preview.fontDisplay }}>{store.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
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

      <section className="rounded-[1.35rem] border border-slate-100/80 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] sm:p-5">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              {t("colorCustomization")}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              {t("colorCustomizationHint")}
            </p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={resetOverrides}>
            {t("resetColors")}
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3">
          {THEME_TOKEN_KEYS.map((key) => {
            const value = preview[key];
            const locked =
              !fullThemeCustomization &&
              !(BASIC_THEME_COLOR_KEYS as readonly string[]).includes(key);
            return (
              <div
                key={key}
                className={cn("min-w-0", locked && "relative opacity-60")}
              >
                <Label htmlFor={`token-${key}`}>
                  {t(TOKEN_LABEL_KEYS[key])}
                  {locked ? (
                    <span className="ms-1 text-[10px] font-semibold text-slate-400">
                      {t("proOnlyLock")}
                    </span>
                  ) : null}
                </Label>
                <div className="flex min-w-0 items-center gap-2">
                  <Input
                    id={`token-${key}`}
                    type="color"
                    value={normalizeHex(value)}
                    onChange={(event) => setToken(key, event.target.value)}
                    className="h-10 w-12 shrink-0 p-1"
                    disabled={locked}
                  />
                  <Input
                    value={value}
                    onChange={(event) => setToken(key, event.target.value)}
                    className="min-w-0"
                    disabled={locked}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-[1.35rem] border border-slate-100/80 bg-white p-4 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] sm:p-5">
        <h2 className="text-base font-semibold text-slate-900">{t("branding")}</h2>

        <div className="mt-3">
          <Label>{t("logoSize")}</Label>
          <p className="mb-1.5 text-xs text-slate-500">{t("logoSizeHint")}</p>
          <div className="flex flex-wrap gap-1.5">
            {LOGO_SIZE_OPTIONS.map((option) => {
              const active = logoSizeId === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setOverrides((prev) => ({
                      ...prev,
                      logoSize: option.value,
                    }))
                  }
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]",
                    active
                      ? "bg-brand-700 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200",
                  )}
                >
                  {t(option.labelKey)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t border-slate-100 pt-3">
          <Label>{t("logoUrl")}</Label>
          <div className="mt-1.5">
            <ImageUploadField
              storeId={store.id}
              kind="logo"
              name="logoUrl"
              value={logoUrl}
              onChange={setLogoUrl}
              compact
            />
          </div>
          <p className="mt-1 text-xs text-slate-500">{t("logoNavHint")}</p>
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
