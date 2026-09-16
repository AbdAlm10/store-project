"use client";

import { FavoriteButton } from "@/components/storefront/favorite-button";
import { SafeImage } from "@/components/ui/safe-image";
import type { ProductImage } from "@/domain/types/entities";
import { cn } from "@/lib/utils/cn";
import { useState } from "react";

export function ProductGallery({
  images,
  productName,
  storeSlug,
  productId,
  featured = false,
  discount = null,
  featuredLabel,
  accent,
}: {
  images: ProductImage[];
  productName: string;
  storeSlug: string;
  productId: string;
  featured?: boolean;
  discount?: number | null;
  featuredLabel?: string;
  accent?: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = images[activeIndex] ?? images[0] ?? null;

  if (!active) {
    return (
      <div
        className="relative flex aspect-4/5 items-center justify-center rounded-xl text-4xl lg:min-h-[70vh]"
        style={{ color: "var(--store-muted)" }}
      >
        —
        <div className="absolute end-3 top-3 z-2">
          <FavoriteButton
            storeSlug={storeSlug}
            productId={productId}
            size="md"
          />
        </div>
      </div>
    );
  }

  function renderThumb(image: ProductImage, index: number, size: "sm" | "md") {
    const selected = index === activeIndex;
    const dim = size === "sm" ? "h-12 w-12" : "h-16 w-16 sm:h-20 sm:w-20";
    return (
      <div key={image.id} className="relative shrink-0">
        {selected && size === "md" ? (
          <span
            className="absolute -start-2.5 top-1/2 hidden h-1.5 w-1.5 -translate-y-1/2 rounded-full sm:block"
            style={{ background: "var(--store-text)" }}
            aria-hidden
          />
        ) : null}
        <button
          type="button"
          onClick={() => setActiveIndex(index)}
          aria-label={image.alt ?? `${productName} ${index + 1}`}
          aria-pressed={selected}
          className={cn(
            "relative overflow-hidden rounded-xl transition",
            dim,
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--store-accent)",
            selected ? "opacity-100" : "opacity-50 hover:opacity-85",
          )}
        >
          <SafeImage
            src={image.url}
            alt={image.alt ?? productName}
            fill
            className="object-cover rounded-xl"
            sizes={size === "sm" ? "48px" : "80px"}
          />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 sm:flex-row sm:items-stretch">
      {images.length > 1 ? (
        <div className="order-2 hidden gap-3 sm:order-1 sm:flex sm:w-20 sm:flex-col sm:gap-4 sm:overflow-visible sm:py-1 sm:ps-3">
          {images.map((image, index) => renderThumb(image, index, "md"))}
        </div>
      ) : null}

      <div className="relative order-1 aspect-4/5 w-full flex-1 overflow-hidden rounded-xl sm:order-2 lg:aspect-auto lg:min-h-[min(78vh,52rem)]">
        <SafeImage
          src={active.url}
          alt={active.alt ?? productName}
          fill
          priority
          className="object-cover rounded-xl"
          sizes="(max-width: 1024px) 100vw, 55vw"
        />

        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28 sm:hidden"
          style={{
            background:
              "linear-gradient(to top, rgba(8,12,10,0.35) 0%, transparent 100%)",
          }}
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-2 flex items-start justify-between gap-2 p-3">
          <div className="flex flex-col items-start gap-1.5 sm:hidden">
            {featured && featuredLabel ? (
              <span
                className="rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white sm:text-[11px]"
                style={{
                  background: accent ?? "var(--store-accent)",
                  backdropFilter: "blur(8px)",
                }}
              >
                {featuredLabel}
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
          <div className="pointer-events-auto ms-auto">
            <FavoriteButton
              storeSlug={storeSlug}
              productId={productId}
              size="md"
            />
          </div>
        </div>

        {images.length > 1 ? (
          <div className="absolute right-3 bottom-3 z-2 flex gap-2 sm:hidden">
            {images.map((image, index) => renderThumb(image, index, "sm"))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
