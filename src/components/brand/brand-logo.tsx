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
    src: "/brand/dukkan-icon.png",
    width: 128,
    height: 128,
    defaultClass: "h-9 w-9",
  },
  wordmark: {
    src: "/brand/dukkan-wordmark.png",
    width: 320,
    height: 120,
    defaultClass: "h-8 w-auto",
  },
  horizontal: {
    src: "/brand/dukkan-horizontal.png",
    width: 1725,
    height: 949,
    defaultClass: "h-9 w-auto",
  },
  "horizontal-white": {
    src: "/brand/dukkan-horizontal-white.png",
    width: 1725,
    height: 949,
    defaultClass: "h-9 w-auto",
  },
  vertical: {
    src: "/brand/dukkan-vertical.png",
    width: 320,
    height: 360,
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
      // Local brand PNGs — skip optimizer so replaced files show without cache lag.
      unoptimized
      className={cn(
        "object-contain object-center select-none",
        asset.defaultClass,
        className,
      )}
    />
  );
}
