"use client";

import { useState, type MouseEvent } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SafeImage } from "@/components/ui/safe-image";
import { discountPercent } from "@/domain/rules/store-rules";
import type { ProductWithMedia } from "@/domain/types/entities";
import type { Locale } from "@/i18n/config";
import { useI18n } from "@/i18n/provider";
import {
  findHexInSchema,
  isColorOptionName,
  resolveValueHex,
} from "@/lib/option-colors";
import { formatMoney } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";

/** Truncate on a word boundary and append ellipsis when there is more text. */
function truncateWithEllipsis(text: string, maxChars: number): string {
  if (text.length <= maxChars) return text;
  const slice = text.slice(0, maxChars + 1);
  const breakAt = Math.max(slice.lastIndexOf(" "), slice.lastIndexOf("\u00a0"));
  const cut =
    breakAt > Math.floor(maxChars * 0.55)
      ? slice.slice(0, breakAt)
      : text.slice(0, maxChars);
  return `${cut.trimEnd()}...`;
}

export function ProductCardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("flex h-full flex-col overflow-hidden", className)}
      style={{
        borderRadius: "1.35rem",
        background: "var(--store-card, #fff)",
        border:
          "1px solid color-mix(in srgb, var(--store-border, #ebe0c4) 70%, transparent)",
      }}
    >
      <div
        className="relative aspect-4/5 animate-pulse rounded-t-[1.35rem]"
        style={{
          background:
            "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, var(--store-surface, #fff))",
        }}
      >
        <div
          className="absolute start-2.5 top-2.5 h-5 w-10 animate-pulse rounded-full"
          style={{
            background:
              "color-mix(in srgb, var(--store-surface, #fff) 80%, transparent)",
          }}
        />
      </div>
      <div className="flex flex-1 flex-col gap-2 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5">
        <div
          className="h-3.5 w-[82%] animate-pulse rounded"
          style={{
            background:
              "color-mix(in srgb, var(--store-border, #ebe0c4) 70%, transparent)",
          }}
        />
        <div
          className="h-2.5 w-[38%] animate-pulse rounded"
          style={{
            background:
              "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
          }}
        />
        <div
          className="mt-0.5 h-2.5 w-full animate-pulse rounded"
          style={{
            background:
              "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, transparent)",
          }}
        />
        <div
          className="h-2.5 w-[72%] animate-pulse rounded"
          style={{
            background:
              "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, transparent)",
          }}
        />
        <div className="mt-auto flex items-end justify-between pt-3">
          <div
            className="h-4 w-16 animate-pulse rounded"
            style={{
              background:
                "color-mix(in srgb, var(--store-border, #ebe0c4) 70%, transparent)",
            }}
          />
          <div className="flex gap-1">
            <div
              className="h-3.5 w-3.5 animate-pulse rounded-full"
              style={{
                background:
                  "color-mix(in srgb, var(--store-border, #ebe0c4) 70%, transparent)",
              }}
            />
            <div
              className="h-3.5 w-3.5 animate-pulse rounded-full"
              style={{
                background:
                  "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
              }}
            />
            <div
              className="hidden h-3.5 w-3.5 animate-pulse rounded-full sm:block"
              style={{
                background:
                  "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, transparent)",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProductCard({
  product,
  href,
  accent,
  className,
  locale = "ar",
  priority = false,
}: {
  product: ProductWithMedia;
  href: string;
  accent?: string;
  className?: string;
  locale?: Locale;
  priority?: boolean;
}) {
  const { t } = useI18n();
  const images = product.images;
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0] ?? null;
  const imageCount = Math.min(images.length, 4);
  const canFlip = images.length > 1;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const subtitle = product.category?.name ?? null;
  const fullDescription = product.description
    ? product.description.replace(/\s+/g, " ").trim()
    : null;
  const description = fullDescription
    ? truncateWithEllipsis(fullDescription, 110)
    : null;

  const schema = product.category?.optionSchema ?? [];
  const colorOption = schema.find(
    (opt) => opt.kind === "color" || isColorOptionName(opt.name),
  );
  const colorLabelsFromVariants = new Set<string>();
  if (colorOption) {
    for (const variant of product.variants) {
      for (const [key, value] of Object.entries(variant.options)) {
        if (
          key.toLowerCase() === colorOption.name.toLowerCase() ||
          isColorOptionName(key)
        ) {
          colorLabelsFromVariants.add(value.toLowerCase());
        }
      }
    }
  }

  const allColorSwatches = colorOption
    ? colorOption.values
        .filter((value) =>
          colorLabelsFromVariants.has(value.label.toLowerCase()),
        )
        .map((value) => ({
          label: value.label,
          hex:
            resolveValueHex(value) ??
            findHexInSchema(schema, colorOption.name, value.label) ??
            "#94A3B8",
        }))
    : [];
  const colorSwatches = allColorSwatches.slice(0, 3);
  const extraColors = Math.max(
    0,
    allColorSwatches.length - colorSwatches.length,
  );

  function stepImage(delta: number, event: MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (images.length < 2) return;
    setActiveIndex((current) => (current + delta + images.length) % images.length);
  }

  return (
    <Link
      href={href}
      prefetch
      className={cn(
        "group/card relative flex h-full flex-col overflow-hidden outline-none",
        "transition-[transform,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-24px_rgba(0,0,0,0.28)]",
        "focus-visible:ring-2 focus-visible:ring-(--store-accent) focus-visible:ring-offset-2 focus-visible:ring-offset-(--store-bg)",
        className,
      )}
      style={{
        borderRadius: "1.35rem",
        background: "var(--store-card)",
        border:
          "1px solid color-mix(in srgb, var(--store-border) 70%, transparent)",
        boxShadow: "0 10px 28px -22px rgba(0,0,0,0.35)",
        fontFamily: "var(--store-font-body)",
        color: "var(--store-text)",
      }}
    >
      <div className="relative aspect-4/5 overflow-hidden rounded-t-[1.35rem]">
        {active ? (
          <SafeImage
            src={active.url}
            alt={active.alt ?? product.name}
            fill
            priority={priority}
            className="object-cover transition duration-500 ease-out group-hover/card:scale-[1.03]"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
          />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{
              background:
                "color-mix(in srgb, var(--store-border) 55%, var(--store-surface))",
              color: "var(--store-muted)",
            }}
          >
            —
          </div>
        )}

        {/* Soft fog blur kept on the image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-1 h-[42%]">
          <div
            className="absolute inset-x-0 bottom-0 h-[60%] backdrop-blur-[2px]"
            style={{
              maskImage: "linear-gradient(to top, black 35%, transparent 100%)",
              WebkitMaskImage:
                "linear-gradient(to top, black 35%, transparent 100%)",
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(to top, rgba(8,12,10,0.28) 0%, rgba(8,12,10,0.1) 45%, transparent 100%)",
            }}
          />
        </div>

        {product.featured || discount ? (
          <div className="absolute start-0 top-0 z-2 flex flex-col items-start gap-1 p-2.5">
            {product.featured ? (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white sm:text-[11px]"
                style={{
                  background: accent ?? "var(--store-accent)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {t("featured")}
              </span>
            ) : null}
            {discount ? (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white sm:text-[11px]"
                style={{
                  background: "rgba(20, 24, 22, 0.55)",
                  backdropFilter: "blur(8px)",
                }}
              >
                -{discount}%
              </span>
            ) : null}
          </div>
        ) : null}

        {canFlip ? (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(event) => stepImage(-1, event)}
              className="absolute start-1.5 top-1/2 z-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-80 backdrop-blur-[2px] transition hover:bg-black/50 hover:opacity-100 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover/card:opacity-90"
            >
              <ChevronLeft className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.25} />
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(event) => stepImage(1, event)}
              className="absolute end-1.5 top-1/2 z-3 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white opacity-80 backdrop-blur-[2px] transition hover:bg-black/50 hover:opacity-100 sm:h-7 sm:w-7 sm:opacity-0 sm:group-hover/card:opacity-90"
            >
              <ChevronRight className="h-3.5 w-3.5 rtl:rotate-180" strokeWidth={2.25} />
            </button>
          </>
        ) : null}

        {imageCount > 1 ? (
          <div className="absolute inset-x-0 bottom-2.5 z-2 flex justify-center gap-1.5 max-sm:bottom-11">
            {Array.from({ length: imageCount }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-1.5 w-1.5 rounded-full transition-colors duration-300",
                  index === Math.min(activeIndex, imageCount - 1)
                    ? "bg-white"
                    : "bg-white/45",
                )}
              />
            ))}
          </div>
        ) : null}

        {/* Mobile: price + color swatches on the image */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-3 sm:hidden">
          <div className="absolute bottom-2.5 left-2.5 min-w-0" dir="ltr">
            <div className="flex flex-col items-start gap-0.5 text-left">
              {product.compareAtPrice ? (
                <span className="text-[10px] leading-none tabular-nums text-white/70 line-through drop-shadow-sm">
                  {formatMoney(
                    product.compareAtPrice,
                    product.currency,
                    locale,
                  )}
                </span>
              ) : null}
              <span className="text-[15px] font-bold leading-none tracking-tight tabular-nums text-white drop-shadow-[0_1px_8px_rgba(0,0,0,0.45)]">
                {formatMoney(product.price, product.currency, locale)}
              </span>
            </div>
          </div>

          {colorSwatches.length > 0 ? (
            <div className="absolute bottom-2.5 right-2.5 flex shrink-0 items-center">
              {colorSwatches.map((swatch, index) => (
                <span
                  key={swatch.label}
                  title={swatch.label}
                  className={cn(
                    "h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-white/85",
                    index > 0 && "-ms-1",
                  )}
                  style={{ background: swatch.hex }}
                />
              ))}
              {extraColors > 0 ? (
                <span className="-ms-0.5 ps-1 text-[11px] font-bold leading-none tracking-widest text-white drop-shadow-sm">
                  ...
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3 sm:px-4 sm:pb-4 sm:pt-3.5">
        <h3
          className="text-[13px] font-bold leading-snug tracking-tight sm:text-[15px]"
          style={{
            fontFamily: "var(--store-font-display)",
            color: "var(--store-text)",
          }}
        >
          <span className="line-clamp-2">{product.name}</span>
        </h3>

        {subtitle ? (
          <p
            className="line-clamp-1 text-[11px] font-medium leading-snug sm:text-xs"
            style={{ color: "var(--store-muted)" }}
          >
            {subtitle}
          </p>
        ) : null}

        {description ? (
          <p
            className="text-[10px] leading-relaxed sm:text-[11px]"
            style={{
              color: "color-mix(in srgb, var(--store-muted) 78%, transparent)",
            }}
          >
            {description}
          </p>
        ) : null}

        <div className="mt-auto hidden items-end justify-between gap-2 pt-3 sm:flex">
          <div
            className="flex min-w-0 flex-col items-start gap-0.5 text-left"
            dir="ltr"
          >
            {product.compareAtPrice ? (
              <span
                className="text-[11px] leading-none tabular-nums line-through"
                style={{ color: "var(--store-muted)" }}
              >
                {formatMoney(product.compareAtPrice, product.currency, locale)}
              </span>
            ) : null}
            <span
              className="text-[17px] font-bold leading-none tracking-tight tabular-nums"
              style={{ color: "var(--store-text)" }}
            >
              {formatMoney(product.price, product.currency, locale)}
            </span>
          </div>

          {colorSwatches.length > 0 ? (
            <div className="flex shrink-0 items-center pb-0.5">
              {colorSwatches.map((swatch, index) => (
                <span
                  key={swatch.label}
                  title={swatch.label}
                  className={cn(
                    "h-3.5 w-3.5 rounded-full shadow-sm ring-1 ring-black/10",
                    index > 0 && "-ms-1",
                  )}
                  style={{ background: swatch.hex }}
                />
              ))}
              {extraColors > 0 ? (
                <span
                  className="-ms-0.5 ps-1 text-[12px] font-bold leading-none tracking-widest"
                  style={{ color: "var(--store-muted)" }}
                >
                  ...
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
