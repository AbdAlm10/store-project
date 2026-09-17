import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

/** Browser-chrome frame for marketing product shots — fixed equal size. */
export function ProductFrame({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div
      className={cn(
        "flex h-full w-full flex-col overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-4">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        {label ? (
          <span className="ms-2 truncate text-[11px] font-medium text-slate-400">
            {label}
          </span>
        ) : null}
      </div>
      <div className="relative min-h-0 w-full flex-1 overflow-hidden bg-white">
        {children}
      </div>
    </div>
  );
}

export function MarketingShot({
  src,
  alt,
  label,
  className,
  fallback,
}: {
  src?: string | null;
  alt: string;
  label?: string;
  className?: string;
  fallback: ReactNode;
}) {
  return (
    <div className={cn("h-full w-full", className)}>
      {/* Same outer box for every shot (~16:9 like the real screenshots) */}
      <div className="aspect-[16/9] w-full">
        <ProductFrame className="h-full" label={label}>
          {src ? (
            <Image
              src={src}
              alt={alt}
              fill
              className="object-cover object-top"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 overflow-hidden [&_>div]:h-full [&_>div]:min-h-full [&_>div]:w-full">
              {fallback}
            </div>
          )}
        </ProductFrame>
      </div>
    </div>
  );
}
