"use client";

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
  productName,
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
  productName: string;
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
  const [selectedId, setSelectedId] = useState<string | null>(
    variants[0]?.id ?? null,
  );
  const [shareHint, setShareHint] = useState(false);

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

  const [picked, setPicked] = useState<Record<string, string>>(() => {
    const first = variants[0];
    return first ? { ...first.options } : {};
  });

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

  return (
    <div className="flex h-full flex-col gap-4 lg:gap-8">
      {optionAxes.length > 0 ? (
        <div className="space-y-3">
          {optionAxes.map((axis) => (
            <div key={axis.name} className="space-y-3">
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
                          onClick={() =>
                            setPicked((prev) => ({
                              ...prev,
                              [axis.name]: value.label,
                            }))
                          }
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
                      onClick={() =>
                        setPicked((prev) => ({
                          ...prev,
                          [axis.name]: value.label,
                        }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : variants.length > 0 ? (
        <div className="space-y-3">
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
                onClick={() => setSelectedId(variant.id)}
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

        <div className="flex items-stretch gap-3">
          {waHref ? (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex rounded-2xl h-14 min-h-14 flex-1 items-center justify-center px-6 text-sm font-bold tracking-[0.08em] uppercase transition active:scale-[0.99]"
              style={{
                backgroundColor:
                  activeStock === 0
                    ? "color-mix(in srgb, var(--store-accent) 55%, transparent)"
                    : "var(--store-accent)",
                color: "var(--store-button-text)",
                pointerEvents: activeStock === 0 ? "none" : undefined,
                opacity: activeStock === 0 ? 0.7 : 1,
              }}
            >
              {activeStock === 0 ? t("outOfStock") : t("orderWhatsApp")}
            </a>
          ) : (
            <div
              className="inline-flex rounded-2xl h-14 flex-1 items-center justify-center px-6 text-sm font-bold"
              style={{
                background: "var(--store-text)",
                color: "var(--store-bg)",
              }}
            >
              {t("orderWhatsApp")}
            </div>
          )}

          <button
            type="button"
            onClick={handleShare}
            aria-label={t("share")}
            title={shareHint ? t("copied") : t("share")}
            className="inline-flex rounded-2xl h-14 w-14 shrink-0 items-center justify-center transition active:scale-[0.97]"
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
  );
}
