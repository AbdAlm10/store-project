import Image from "next/image";
import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

/** Browser-chrome frame for marketing product shots. */
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
        "overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-[0_30px_80px_-40px_rgba(15,23,42,0.35)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/90 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        {label ? (
          <span className="ms-2 truncate text-[11px] font-medium text-slate-400">
            {label}
          </span>
        ) : null}
      </div>
      <div className="relative bg-white">{children}</div>
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
    <ProductFrame className={className} label={label}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={1600}
          height={1000}
          className="h-auto w-full object-cover object-top"
        />
      ) : (
        fallback
      )}
    </ProductFrame>
  );
}
