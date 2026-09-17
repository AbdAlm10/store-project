"use client";

import { FavoriteButton } from "@/components/storefront/favorite-button";
import { SafeImage } from "@/components/ui/safe-image";
import { discountPercent } from "@/domain/rules/store-rules";
import type { ProductWithMedia } from "@/domain/types/entities";
import { useI18n } from "@/i18n/provider";
import { readFavorites, pruneFavorites } from "@/lib/favorites";
import { formatMoney } from "@/lib/social/sharing";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState, useSyncExternalStore } from "react";

function subscribeFavorites(storeSlug: string, onChange: () => void) {
  function onCustom(event: Event) {
    const detail = (event as CustomEvent<{ storeSlug?: string }>).detail;
    if (detail?.storeSlug && detail.storeSlug !== storeSlug) return;
    onChange();
  }
  function onStorage(event: StorageEvent) {
    if (event.key && event.key !== `ys:favorites:${storeSlug}`) return;
    onChange();
  }
  window.addEventListener("ys:favorites-change", onCustom);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener("ys:favorites-change", onCustom);
    window.removeEventListener("storage", onStorage);
  };
}

function useFavoriteIds(storeSlug: string) {
  return useSyncExternalStore(
    (onChange) => subscribeFavorites(storeSlug, onChange),
    () => readFavorites(storeSlug).join(","),
    () => "",
  );
}

export function FavoritesMenu({
  storeSlug,
  products,
}: {
  storeSlug: string;
  products: ProductWithMedia[];
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const idsKey = useFavoriteIds(storeSlug);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    pruneFavorites(
      storeSlug,
      products.map((product) => product.id),
    );
  }, [mounted, storeSlug, products]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const favoriteIds = useMemo(
    () => (idsKey ? idsKey.split(",") : []),
    [idsKey],
  );

  const favoriteProducts = useMemo(() => {
    if (!favoriteIds.length) return [];
    const byId = new Map(products.map((product) => [product.id, product]));
    return favoriteIds
      .map((id) => byId.get(id))
      .filter((product): product is ProductWithMedia => Boolean(product));
  }, [favoriteIds, products]);

  const count = mounted ? favoriteProducts.length : 0;

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition hover:opacity-90 active:scale-[0.98] sm:text-sm"
        style={{
          background:
            "color-mix(in srgb, var(--store-surface) 88%, transparent)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 55%, transparent)",
          color: "black",
        }}
      >
        <Heart
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={count > 0 ? 0 : 2}
          fill={count > 0 ? "currentColor" : "none"}
          aria-hidden
          style={{ color: "#e11d48" }}
        />
        <span>{t("favorites")}</span>
        {count > 0 ? (
          <span
            className="inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold"
            style={{
              background: "color-mix(in srgb, #e11d48 14%, transparent)",
              color: "#e11d48",
            }}
          >
            {count}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("favorites")}
          dir="rtl"
          className="absolute left-0 top-[calc(100%+0.35rem)] z-40 w-[min(18.5rem,calc(100vw-2rem))] overflow-hidden rounded-2xl"
          style={{
            background: "var(--store-surface)",
            color: "var(--store-text)",
            boxShadow: "0 16px 40px -18px rgba(15,23,42,0.28)",
          }}
        >
          <div className="flex items-center justify-between gap-2 px-2.5 pb-1 pt-2">
            <p
              className="text-xs font-bold tracking-tight"
              style={{ fontFamily: "var(--store-font-display)" }}
            >
              {t("favorites")}
            </p>
            <span className="text-[11px]" style={{ color: "var(--store-muted)" }}>
              {count} {t("productsCount").toLowerCase()}
            </span>
          </div>

          {favoriteProducts.length === 0 ? (
            <p
              className="px-2.5 py-4 text-center text-xs leading-relaxed"
              style={{ color: "var(--store-muted)" }}
            >
              {t("favoritesEmpty")}
            </p>
          ) : (
            <ul className="ys-scrollbar-none flex max-h-[min(22rem,55vh)] flex-col overflow-y-auto px-1 pb-1.5">
              {favoriteProducts.map((product) => (
                <FavoriteRow
                  key={product.id}
                  product={product}
                  storeSlug={storeSlug}
                  locale={locale}
                  onNavigate={() => setOpen(false)}
                />
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}

function FavoriteRow({
  product,
  storeSlug,
  locale,
  onNavigate,
}: {
  product: ProductWithMedia;
  storeSlug: string;
  locale: string;
  onNavigate: () => void;
}) {
  const { t } = useI18n();
  const image = product.images[0] ?? null;
  const discount = discountPercent(product.price, product.compareAtPrice);
  const href = `/${storeSlug}/products/${product.slug}`;

  return (
    <li>
      <div className="group flex items-center gap-1.5 rounded-xl px-1.5 py-1 transition hover:bg-black/5">
        <div className="order-3 flex shrink-0 items-center">
          <FavoriteButton
            storeSlug={storeSlug}
            productId={product.id}
            size="sm"
          />
        </div>

        <Link
          href={href}
          prefetch
          onClick={onNavigate}
          className="order-1 flex min-w-0 flex-1 items-center gap-2"
        >
          <div
            className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg"
            style={{
              background:
                "color-mix(in srgb, var(--store-border) 45%, var(--store-surface))",
            }}
          >
            {image ? (
              <SafeImage
                src={image.url}
                alt={image.alt ?? product.name}
                fill
                className="object-cover"
                sizes="44px"
              />
            ) : (
              <span
                className="flex h-full items-center justify-center text-xs"
                style={{ color: "var(--store-muted)" }}
              >
                —
              </span>
            )}
          </div>

          <div className="min-w-0 flex-1 overflow-hidden text-start">
            <p
              className="truncate text-sm font-semibold tracking-tight"
              style={{ fontFamily: "var(--store-font-display)" }}
            >
              {product.name}
            </p>
            <div className="mt-0.5 flex flex-wrap items-center justify-start gap-x-1.5 gap-y-0.5">
              <span className="text-xs font-semibold tabular-nums">
                {formatMoney(product.price, product.currency, locale as "ar")}
              </span>
              {discount ? (
                <span
                  className="text-[10px] font-bold"
                  style={{ color: "var(--store-accent)" }}
                >
                  -{discount}%
                </span>
              ) : null}
              {product.featured ? (
                <span
                  className="text-[10px] font-semibold"
                  style={{ color: "var(--store-muted)" }}
                >
                  {t("featured")}
                </span>
              ) : null}
            </div>
          </div>
        </Link>
      </div>
    </li>
  );
}
