import Link from "next/link";
import type { ProductWithMedia } from "@/domain/types/entities";
import { discountPercent } from "@/domain/rules/store-rules";
import { formatMoney } from "@/lib/social/sharing";
import { SafeImage } from "@/components/ui/safe-image";
import { cn } from "@/lib/utils/cn";
import type { Locale } from "@/i18n/config";
import {
  findHexInSchema,
  isColorOptionName,
  resolveValueHex,
} from "@/lib/option-colors";

export function ProductCard({
  product,
  href,
  accent,
  className,
  locale = "ar",
}: {
  product: ProductWithMedia;
  href: string;
  accent?: string;
  className?: string;
  locale?: Locale;
}) {
  const image = product.images[0];
  const discount = discountPercent(product.price, product.compareAtPrice);
  const schema = product.category?.optionSchema ?? [];

  const colorOption =
    schema.find((opt) => opt.kind === "color" || isColorOptionName(opt.name)) ??
    null;

  const colorLabelsFromVariants = new Set<string>();
  if (colorOption) {
    for (const variant of product.variants) {
      const value = variant.options[colorOption.name];
      if (value) colorLabelsFromVariants.add(value);
    }
  }

  const colorSwatches = (
    colorOption
      ? colorOption.values
          .filter(
            (value) =>
              colorLabelsFromVariants.size === 0 ||
              colorLabelsFromVariants.has(value.label),
          )
          .map((value) => ({
            label: value.label,
            hex:
              resolveValueHex(value) ??
              findHexInSchema(schema, colorOption.name, value.label) ??
              "#94A3B8",
          }))
      : []
  ).slice(0, 6);

  const otherOptions = schema
    .filter((opt) => opt !== colorOption)
    .slice(0, 3);

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group block overflow-hidden transition hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10",
        className,
      )}
      style={{
        background: "var(--store-card, #fff)",
        color: "var(--store-text, #0f172a)",
        boxShadow: "inset 0 0 0 1px var(--store-border, #e2e8f0)",
        borderRadius: "var(--store-radius, 1.25rem)",
        fontFamily: "var(--store-font-body)",
      }}
    >
      <div
        className="relative aspect-[4/5] overflow-hidden"
        style={{ background: "var(--store-surface, #f1f5f9)" }}
      >
        {image ? (
          <SafeImage
            src={image.url}
            alt={image.alt ?? product.name}
            fill
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        ) : (
          <div
            className="flex h-full items-center justify-center text-sm"
            style={{ color: "var(--store-muted, #94a3b8)" }}
          >
            —
          </div>
        )}
        <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3">
          {product.category ? (
            <span
              className="max-w-[70%] truncate rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white backdrop-blur"
              style={{
                background: "color-mix(in srgb, black 45%, transparent)",
              }}
            >
              {product.category.name}
            </span>
          ) : (
            <span />
          )}
          {discount ? (
            <span
              className="rounded-full px-2 py-1 text-[10px] font-bold text-white"
              style={{
                backgroundColor: accent ?? "var(--store-accent, #58a379)",
                color: "var(--store-button-text, #fff)",
              }}
            >
              -{discount}%
            </span>
          ) : null}
        </div>
        {colorSwatches.length > 0 ? (
          <div className="absolute inset-x-0 bottom-0 flex items-center gap-1.5 bg-gradient-to-t from-black/35 to-transparent p-3 pt-8">
            {colorSwatches.map((swatch) => (
              <span
                key={swatch.label}
                title={`${swatch.label} (${swatch.hex})`}
                className="h-3.5 w-3.5 rounded-full ring-2 ring-white/90"
                style={{ background: swatch.hex }}
              />
            ))}
            {colorOption && colorOption.values.length > colorSwatches.length ? (
              <span className="text-[10px] font-semibold text-white/90">
                +{colorOption.values.length - colorSwatches.length}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
      <div className="space-y-2 p-3.5 sm:p-4">
        <h3
          className="line-clamp-2 text-sm font-semibold leading-snug"
          style={{ fontFamily: "var(--store-font-display)" }}
        >
          {product.name}
        </h3>
        {otherOptions.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {otherOptions.map((opt) => (
              <span
                key={opt.id}
                className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                style={{
                  background: "var(--store-surface)",
                  color: "var(--store-muted)",
                  boxShadow: "inset 0 0 0 1px var(--store-border)",
                }}
              >
                {opt.name}
                {opt.values[0]
                  ? `: ${opt.values
                      .slice(0, 2)
                      .map((value) => value.label)
                      .join("/")}`
                  : ""}
              </span>
            ))}
          </div>
        ) : null}
        <div className="flex items-baseline gap-2">
          <span className="text-base font-bold">
            {formatMoney(product.price, product.currency, locale)}
          </span>
          {product.compareAtPrice ? (
            <span
              className="text-sm line-through"
              style={{ color: "var(--store-muted, #94a3b8)" }}
            >
              {formatMoney(product.compareAtPrice, product.currency, locale)}
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
