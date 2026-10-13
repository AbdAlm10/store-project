import { PoweredByBrand } from "@/components/brand/powered-by-brand";
import type { PlanId } from "@/config/plans";
import { showsDukkanStorefrontBadge } from "@/domain/storefront/badge";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";

export function StorefrontPlanCredit({
  planId,
  className,
}: {
  planId: PlanId | null;
  className?: string;
}) {
  if (!showsDukkanStorefrontBadge(planId)) {
    return <PoweredByBrand className={className} />;
  }
  return (
    <Link
      href="/"
      prefetch={false}
      className={cn(
        "inline-flex items-center text-xs font-semibold underline-offset-2 hover:underline",
        className,
      )}
      style={{ color: "var(--store-muted)" }}
    >
      متجري على دكّان
    </Link>
  );
}
