"use client";

import { useMemo, useState } from "react";
import type {
  CategoryOptionDef,
  ProductVariant,
  Store,
} from "@/domain/types/entities";
import { formatMoney } from "@/lib/social/sharing";
import { useI18n } from "@/i18n/provider";
import { ShareBar } from "@/components/storefront/share-bar";
import {
  ColorSwatchButton,
  TextOptionChip,
} from "@/components/storefront/option-swatches";
import {
  findHexInSchema,
  isColorOptionName,
  resolveValueHex,
} from "@/lib/option-colors";

export function ProductPurchasePanel({
  store,
  productName,
  basePrice,
  compareAtPrice,
  currency,
  stock,
  variants,
  optionSchema = [],
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
  whatsappUrl: string | null;
  shareUrl: string;
  shareText: string;
}) {
  const { t, locale } = useI18n();
  const [selectedId, setSelectedId] = useState<string | null>(
    variants[0]?.id ?? null,
  );

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
              const inStock = !available || available.has(label);
              // If variants exist, only show values that appear on this product
              if (fromVariants.size > 0 && available && !available.has(label)) {
                return null;
              }
              return {
                label,
                hex:
                  resolveValueHex(value) ??
                  findHexInSchema(optionSchema, opt.name, label),
                available: inStock,
              };
            })
            .filter((item): item is NonNullable<typeof item> => Boolean(item));

          // Include any variant-only values not in schema
          if (available) {
            for (const label of available) {
              if (!values.some((item) => item.label === label)) {
                values.push({
                  label,
                  hex: findHexInSchema(optionSchema, opt.name, label),
                  available: true,
                });
              }
            }
          }

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

  const selectionSummary = optionAxes
    .map((axis) => {
      const value = picked[axis.name];
      return value ? `${axis.name}: ${value}` : null;
    })
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-3xl font-bold">
          {formatMoney(price, currency as "USD", locale)}
        </span>
        {compareAtPrice ? (
          <span className="text-lg opacity-50 line-through">
            {formatMoney(compareAtPrice, currency as "USD", locale)}
          </span>
        ) : null}
      </div>

      <p className="text-sm opacity-70">
        {activeStock === 0
          ? t("outOfStock")
          : activeStock != null
            ? `${activeStock} ${t("inStock")}`
            : t("available")}
      </p>

      {optionAxes.length > 0 ? (
        <div className="space-y-5">
          <div className="flex items-end justify-between gap-3">
            <h2 className="text-sm font-semibold">{t("chooseOptions")}</h2>
            {selectionSummary ? (
              <p
                className="text-xs"
                style={{ color: "var(--store-muted)" }}
              >
                {selectionSummary}
              </p>
            ) : null}
          </div>
          {optionAxes.map((axis) => (
            <div key={axis.name} className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <p
                  className="text-xs font-semibold uppercase tracking-wide"
                  style={{ color: "var(--store-muted)" }}
                >
                  {axis.name}
                </p>
                {picked[axis.name] ? (
                  <span className="text-xs font-medium">{picked[axis.name]}</span>
                ) : null}
              </div>
              {axis.kind === "color" ? (
                <div className="flex flex-wrap items-center gap-3">
                  {axis.values.map((value) => {
                    const hex = value.hex ?? "#94A3B8";
                    const selected = picked[axis.name] === value.label;
                    return (
                      <div
                        key={value.label}
                        className="flex flex-col items-center gap-1.5"
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
                          className="max-w-[4.5rem] truncate text-[10px] font-medium"
                          style={{
                            color: selected
                              ? "var(--store-text)"
                              : "var(--store-muted)",
                          }}
                        >
                          {value.label}
                        </span>
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
        <div>
          <h2 className="mb-2 text-sm font-semibold">{t("variants")}</h2>
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

      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-12 w-full items-center justify-center text-base font-semibold transition active:scale-[0.99] sm:w-auto sm:px-8"
          style={{
            backgroundColor: "var(--store-accent)",
            color: "var(--store-button-text)",
            borderRadius: "var(--store-radius)",
          }}
        >
          {t("orderWhatsApp")}
          {active ? ` · ${active.name}` : ""}
        </a>
      ) : null}

      <div>
        <h2 className="mb-2 text-sm font-semibold">{t("share")}</h2>
        <ShareBar url={shareUrl} text={shareText} />
      </div>

      <p className="text-xs opacity-50">
        {store.name} · {productName}
      </p>
    </div>
  );
}
