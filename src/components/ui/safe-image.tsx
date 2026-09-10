"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";
import { cn } from "@/lib/utils/cn";

type SafeImageProps = Omit<ImageProps, "src" | "alt" | "onError"> & {
  src?: string | null;
  alt: string;
  fallbackClassName?: string;
};

/**
 * Renders merchant-supplied remote image URLs from any host.
 * Falls back to a blank surface when the URL is a page link or fails to load
 * (e.g. pinterest.com/pin/... instead of a direct .jpg/.png CDN URL).
 */
export function SafeImage({
  src,
  alt,
  className,
  fallbackClassName,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center bg-slate-100 text-slate-400",
          fallbackClassName,
          className,
        )}
        aria-hidden
      />
    );
  }

  return (
    <Image
      {...props}
      src={src}
      alt={alt}
      className={className}
      unoptimized
      onError={() => setFailed(true)}
    />
  );
}
