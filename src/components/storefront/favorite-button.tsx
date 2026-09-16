"use client";

import { Heart } from "lucide-react";
import { useFavorite } from "@/hooks/use-favorite";
import { useI18n } from "@/i18n/provider";
import { cn } from "@/lib/utils/cn";
import type { MouseEvent } from "react";

export function FavoriteButton({
  storeSlug,
  productId,
  className,
  size = "md",
}: {
  storeSlug: string;
  productId: string;
  className?: string;
  size?: "sm" | "md" | "lg";
}) {
  const { t } = useI18n();
  const { favorited, toggle, ready } = useFavorite(storeSlug, productId);

  const dims =
    size === "sm"
      ? "h-8 w-8"
      : size === "lg"
        ? "h-11 w-11"
        : "h-9 w-9";
  const icon =
    size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-5 w-5" : "h-4 w-4";

  function onClick(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    toggle();
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={favorited}
      aria-label={favorited ? t("removeFromFavorites") : t("addToFavorites")}
      title={favorited ? t("removeFromFavorites") : t("addToFavorites")}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition hover:scale-105 active:scale-95",
        dims,
        className,
      )}
      style={{
        background: "color-mix(in srgb, var(--store-surface, #fff) 55%, transparent)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow:
          "inset 0 0 0 1px color-mix(in srgb, var(--store-border, #fff) 35%, transparent)",
        color: favorited && ready ? "#e11d48" : "var(--store-text, #1c241e)",
        opacity: ready ? 1 : 0.7,
      }}
    >
      <Heart
        className={icon}
        strokeWidth={favorited && ready ? 0 : 2}
        fill={favorited && ready ? "currentColor" : "none"}
      />
    </button>
  );
}
