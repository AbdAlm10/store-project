import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * Logo variants by available space:
 * - icon: favicon, mobile compact, dark headers
 * - wordmark: text-only when horizontal space is tight but brand name needed
 * - horizontal: navbars / sidebars with room (icon + دكّان)
 * - vertical: hero / empty states / auth splash
 */
export type BrandLogoVariant =
  | "icon"
  | "wordmark"
  | "horizontal"
  | "horizontal-white"
  | "vertical";

const ASSETS: Record<
  BrandLogoVariant,
  { src: string; width: number; height: number; defaultClass: string }
> = {
  icon: {
    src: "/brand/dukkan-icon.webp",
    width: 420,
    height: 459,
    defaultClass: "h-9 w-9",
  },
  wordmark: {
    src: "/brand/dukkan-wordmark.webp",
    width: 480,
    height: 286,
    defaultClass: "h-8 w-auto",
  },
  horizontal: {
    src: "/brand/dukkan-horizontal.webp",
    width: 640,
    height: 322,
    defaultClass: "h-9 w-auto",
  },
  "horizontal-white": {
    src: "/brand/dukkan-horizontal-white.webp",
    width: 640,
    height: 322,
    defaultClass: "h-9 w-auto",
  },
  vertical: {
    src: "/brand/dukkan-vertical.webp",
    width: 320,
    height: 509,
    defaultClass: "h-28 w-auto",
  },
};

export function BrandLogo({
  variant = "horizontal",
  className,
  priority = false,
  alt = "دكّان",
}: {
  variant?: BrandLogoVariant;
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  const asset = ASSETS[variant];
  return (
    <Image
      src={asset.src}
      alt={alt}
      width={asset.width}
      height={asset.height}
      priority={priority}
      // Pre-sized WebP (each under 15KB). Skip the optimizer so the bytes stay exact.
      unoptimized
      className={cn(
        "object-contain object-center select-none",
        asset.defaultClass,
        className,
      )}
    />
  );
}
