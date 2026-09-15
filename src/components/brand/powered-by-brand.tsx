import { BrandLogo } from "@/components/brand/brand-logo";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

/** Compact Dukkan wordmark credit — replaces “مدعوم بواسطة …” copy. */
export function PoweredByBrand({ className }: { className?: string }) {
  return (
    <div className="flex items-center gap-1 text-xs self-center" style={{ color: "var(--store-muted)" }}>
      <span className="font-bold text-md mt-1">مدعوم بواسطة</span> 
    <Link
      href="/"
      prefetch
      className={cn(
        "inline-flex items-center opacity-80 transition hover:opacity-100",
        className,
      )}
      aria-label="دكّان"
    >
      <BrandLogo variant="wordmark" className="h-5 w-auto sm:h-6" />
    </Link>
    </div>
  );
}
