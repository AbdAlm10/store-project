"use client";

import { FavoriteButton } from "@/components/storefront/favorite-button";
import { useCartOptional } from "@/features/cart/cart-context";
import {
  ColorSwatchButton,
  TextOptionChip,
} from "@/components/storefront/option-swatches";
import type {
  CategoryOptionDef,
  ProductVariant,
  Store,
} from "@/domain/types/entities";
import { useI18n } from "@/i18n/provider";
import { trackAnalyticsEvent } from "@/lib/analytics/client-track";
import {
  findHexInSchema,
  isColorOptionName,
  resolveValueHex,
} from "@/lib/option-colors";
import { formatMoney } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import { Share2 } from "lucide-react";
import { useMemo, useState } from "react";

export function ProductPurchasePanel({
  store,
  productId,
  productName,
  productSlug,
  imageUrl = null,
  basePrice,
  compareAtPrice,
  currency,
  stock,
  variants,
  optionSchema = [],
  specifications = {},
  whatsappUrl,
  shareUrl,
  shareText,
}: {
  store: Store;
  productId: string;
  productName: string;
  productSlug: string;
  imageUrl?: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  currency: string;
  stock: number | null;
  variants: ProductVariant[];
  optionSchema?: CategoryOptionDef[];
  specifications?: Record<string, string>;
  whatsappUrl: string | null;
  shareUrl: string;
  shareText: string;
}) {
  const { t, locale } = useI18n();
  const cart = useCartOptional();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [shareHint, setShareHint] = useState(false);
  const [added, setAdded] = useState(false);
  const [shakeAxes, setShakeAxes] = useState<string[]>([]);
  const [shakeVariants, setShakeVariants] = useState(false);

  const optionAxes = useMemo(() => {
    const fromVariants = new Map<string, Set<string>>();
    for (const variant of variants) {
      for (const [key, value] of Object.entries(variant.options)) {
        if (!fromVariants.has(key)) fromVariants.set(key, new Set());
        fromVariants.get(key)!.add(value);
      }
    }

    if (optionSchema.length > 0) {
      return optionSchema
        .filter((opt) => opt.values.length > 0)
        .map((opt) => {
          const available = fromVariants.get(opt.name);
          const values = opt.values
            .map((value) => {
              const label = value.label;
              if (
                fromVariants.size > 0 &&
                available &&
                !available.has(label)
              ) {
                return null;
              }
              if (fromVariants.size > 0 && !available) {
                return null;
              }
              return {
                label,
                hex:
                  resolveValueHex(value) ??
                  findHexInSchema(optionSchema, opt.name, label),
                available: true,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

          return {
            name: opt.name,
            kind:
              opt.kind === "color" || isColorOptionName(opt.name)
                ? ("color" as const)
                : ("text" as const),
            values,
          };
        })
        .filter((axis) => axis.values.length > 0);
    }

    return [...fromVariants.entries()].map(([name, values]) => ({
      name,
      kind: isColorOptionName(name) ? ("color" as const) : ("text" as const),
      values: [...values].map((label) => ({
        label,
        hex: findHexInSchema(optionSchema, name, label),
        available: true,
      })),
    }));
  }, [variants, optionSchema]);

  const [picked, setPicked] = useState<Record<string, string>>({});

  const matched = useMemo(() => {
    if (!variants.length) return null;
    return (
      variants.find((variant) =>
        Object.entries(picked).every(
          ([key, value]) => variant.options[key] === value,
        ),
      ) ?? null
    );
  }, [variants, picked]);

  const active = matched ?? variants.find((item) => item.id === selectedId);
  const price = active?.price ?? basePrice;
  const activeStock = active?.stock ?? stock;
  const specEntries = Object.entries(specifications);

  let waHref = whatsappUrl;
  const optionLines = active
    ? Object.entries(active.options)
    : Object.entries(picked);
  if (waHref && optionLines.length > 0) {
    const extra = encodeURIComponent(
      `\n${optionLines.map(([k, v]) => `${k}: ${v}`).join("\n")}`,
    );
    waHref = waHref.includes("?") ? `${waHref}${extra}` : waHref;
  }

  async function handleShare() {
    try {
      trackAnalyticsEvent({
        storeId: store.id,
        productId,
        eventType: "share",
        path: shareUrl,
        source: "product",
      });
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: productName, text: shareText, url: shareUrl });
        return;
      }
      await navigator.clipboard.writeText(shareUrl);
      setShareHint(true);
      setTimeout(() => setShareHint(false), 1600);
    } catch {
      /* user cancelled share */
    }
  }

  function handleAddToCart() {
    if (activeStock === 0) return;
    const missing = optionAxes
      .filter((axis) => !picked[axis.name])
      .map((axis) => axis.name);
    if (missing.length > 0) {
      setShakeAxes(missing);
      return;
    }
    if (optionAxes.length === 0 && variants.length > 0 && !selectedId) {
      setShakeVariants(true);
      return;
    }
    const options = optionAxes.length
      ? Object.fromEntries(optionAxes.map((axis) => [axis.name, picked[axis.name] ?? ""]))
      : { ...(active?.options ?? {}) };
    cart?.addLine({
      productId,
      slug: productSlug,
      name: productName,
      imageUrl,
      options,
      quantity: 1,
      unitPrice: price,
      currency,
    });
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1000);
  }

  function handleWhatsAppClick() {
    trackAnalyticsEvent({
      storeId: store.id,
      productId,
      eventType: "whatsapp_click",
      path: `/${store.slug}`,
      source: "product_order",
    });
  }

  return (
    <div className="flex h-full flex-col gap-4 lg:gap-8">
      {optionAxes.length > 0 ? (
        <div className="space-y-3">
          {optionAxes.map((axis) => (
            <div
              key={axis.name}
              className={cn(
                "space-y-3 rounded-2xl",
                shakeAxes.includes(axis.name) && "animate-cart-shake",
              )}
              style={
                shakeAxes.includes(axis.name)
                  ? { outline: "2px solid #f3b4b4", outlineOffset: "4px" }
                  : undefined
              }
            >
              <p
                className="text-[11px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "var(--store-text)" }}
              >
                {axis.name}
              </p>
              {axis.kind === "color" ? (
                <div className="flex flex-wrap items-start gap-4">
                  {axis.values.map((value) => {
                    const hex = value.hex ?? "#94A3B8";
                    const selected = picked[axis.name] === value.label;
                    return (
                      <div
                        key={value.label}
                        className="flex flex-col items-center gap-2"
                      >
                        <ColorSwatchButton
                          label={value.label}
                          hex={hex}
                          size="lg"
                          selected={selected}
                          onClick={() => {
                            setShakeAxes((current) =>
                              current.filter((name) => name !== axis.name),
                            );
                            setPicked((prev) => ({
                              ...prev,
                              [axis.name]: value.label,
                            }));
                          }}
                        />
                        <span
                          className={cn(
                            "h-0.5 w-7 rounded-full transition",
                            selected ? "opacity-100" : "opacity-0",
                          )}
                          style={{ background: "var(--store-text)" }}
                          aria-hidden
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {axis.values.map((value) => (
                    <TextOptionChip
                      key={value.label}
                      label={value.label}
                      selected={picked[axis.name] === value.label}
                      onClick={() => {
                        setShakeAxes((current) =>
                          current.filter((name) => name !== axis.name),
                        );
                        setPicked((prev) => ({
                          ...prev,
                          [axis.name]: value.label,
                        }));
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : variants.length > 0 ? (
        <div
          className={cn("space-y-3 rounded-2xl", shakeVariants && "animate-cart-shake")}
          style={
            shakeVariants
              ? { outline: "2px solid #f3b4b4", outlineOffset: "4px" }
              : undefined
          }
        >
          <p
            className="text-[11px] font-bold uppercase tracking-[0.14em]"
            style={{ color: "var(--store-text)" }}
          >
            {t("variants")}
          </p>
          <div className="flex flex-wrap gap-2">
            {variants.map((variant) => (
              <TextOptionChip
                key={variant.id}
                label={variant.name}
                selected={selectedId === variant.id}
                onClick={() => {
                  setShakeVariants(false);
                  setSelectedId(variant.id);
                }}
              />
            ))}
          </div>
        </div>
      ) : null}

      {specEntries.length > 0 ? (
        <dl className="space-y-4">
          {specEntries.map(([key, value]) => (
            <div
              key={key}
              className="flex items-baseline justify-between gap-6"
            >
              <dt
                className="text-xs font-bold uppercase tracking-[0.12em]"
                style={{ color: "var(--store-text)" }}
              >
                {key}
              </dt>
              <dd
                className="text-end text-base leading-snug"
                style={{ color: "var(--store-muted)" }}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="mt-auto space-y-4 pt-1">
        <div className="space-y-2">
          <div className="flex flex-wrap items-end gap-x-4">
            <span
              className="text-3xl font-bold tracking-tight tabular-nums sm:text-4xl"
              style={{ color: "var(--store-text)" }}
            >
              {formatMoney(price, currency as "USD", locale)}
            </span>
            {compareAtPrice ? (
              <span
                className="pb-1.5 text-lg tabular-nums line-through"
                style={{ color: "var(--store-muted)" }}
              >
                {formatMoney(compareAtPrice, currency as "USD", locale)}
              </span>
            ) : null}
          </div>
          <p className="text-sm" style={{ color: "var(--store-muted)" }} dir="rtl">
            {activeStock === 0
              ? t("outOfStock")
              : activeStock != null
                ? `${activeStock} ${t("inStock")}`
                : t("available")}
          </p>
        </div>

        <div className="space-y-3">
          {store.status === "restricted" ? (
            <div
              className="inline-flex h-12 w-full items-center justify-center rounded-full px-6 text-center text-sm font-bold"
              style={{
                background: "color-mix(in srgb, var(--store-text) 12%, var(--store-bg))",
                color: "var(--store-text)",
              }}
            >
              {t("subscriptionPreviewOrderBlocked")}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={activeStock === 0}
                className="inline-flex h-12 w-full items-center justify-center rounded-full bg-brand-600 px-6 text-base font-bold text-white transition-transform active:scale-[0.99] disabled:opacity-60"
              >
                {activeStock === 0
                  ? t("outOfStock")
                  : added
                    ? t("addedToCart")
                    : t("addToCart")}
              </button>
              {waHref ? (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleWhatsAppClick}
                  className="inline-flex h-12 w-full items-center justify-center rounded-full border border-brand-600 px-6 text-sm font-bold text-brand-600"
                  style={{
                    pointerEvents: activeStock === 0 ? "none" : undefined,
                    opacity: activeStock === 0 ? 0.6 : 1,
                  }}
                >
                  {activeStock === 0 ? t("outOfStock") : t("orderWhatsApp")}
                </a>
              ) : null}
            </>
          )}

          <div className="flex items-stretch gap-3">
            <FavoriteButton
              storeSlug={store.slug}
              productId={productId}
              className="h-12 w-12 rounded-full"
            />

            <button
              type="button"
              onClick={handleShare}
              aria-label={t("share")}
              title={shareHint ? t("copied") : t("share")}
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full transition-transform active:scale-[0.97]"
              style={{
                backgroundColor: "var(--store-text)",
                color: "var(--store-bg)",
              }}
            >
              <Share2 className="h-5 w-5" strokeWidth={2} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
