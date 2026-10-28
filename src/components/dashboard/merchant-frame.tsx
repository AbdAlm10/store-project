import { BrandLogo } from "@/components/brand/brand-logo";
import { MerchantNav } from "@/components/dashboard/merchant-nav";
import { StoreQrButton } from "@/features/dashboard/store-qr-button";
import { EARLY_BIRD_DISCOUNT, getPlan } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Store, Subscription } from "@/domain/types/entities";
import type { Locale } from "@/i18n/config";
import { createTranslator } from "@/i18n/messages";
import { ExternalLink } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export function MerchantFrame({
  children,
  locale,
  store,
  subscription,
  navLocked,
  homeHref,
  storeHref,
  signOut,
  extras,
  overlay,
}: {
  children: ReactNode;
  locale: Locale;
  store: Store | null;
  subscription: Subscription | null;
  navLocked: boolean;
  homeHref: string;
  storeHref: string | null;
  signOut: ReactNode;
  extras?: ReactNode;
  overlay?: ReactNode;
}) {
  const t = createTranslator(locale);
  const planLimits = subscription ? getPlan(effectivePlanId(subscription)).limits : null;

  return (
    <div className="dashboard-shell grid h-full min-h-0 w-full overflow-hidden bg-white lg:grid-cols-[248px_minmax(0,1fr)]">
      {extras}

      <aside className="relative z-10 hidden h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] lg:flex">
        <div className="flex h-full min-h-0 min-w-0 flex-col px-3 py-5">
          <div className="mb-7 flex shrink-0 min-w-0 items-center gap-2 px-2">
            <Link href={homeHref} className="flex min-w-0 items-center" aria-label="دكّان">
              <BrandLogo variant="horizontal" className="h-11 w-auto max-w-full" priority />
            </Link>
            {subscription ? <PlanOfferBadge subscription={subscription} t={t} /> : null}
          </div>

          <div className="ys-scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <MerchantNav storeName={store?.name} locale={locale} embedded locked={navLocked} />
          </div>

          <div className="mt-4 shrink-0 space-y-1 border-t border-slate-100 px-1 pt-4">
            {store && storeHref ? (
              <Link
                href={storeHref}
                target="_blank"
                className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <ExternalLink className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{t("viewStore")}</span>
              </Link>
            ) : null}
            {signOut}
          </div>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
        <header className="relative z-50 shrink-0 border-b border-slate-100/80 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex h-10 items-center gap-3">
            <Link href={homeHref} aria-label="دكّان" className="relative z-[60] min-w-0 lg:hidden">
              <BrandLogo variant="horizontal" className="h-10 w-auto max-w-[9.5rem]" priority />
            </Link>

            <div className="relative z-[60] ms-auto flex items-center gap-1.5 pe-11 lg:pe-0">
              <div className="lg:hidden">
                <MerchantNav locale={locale} compact locked={navLocked} />
              </div>
            </div>
          </div>

          {store && planLimits?.qr ? (
            <div className="absolute left-3 top-1/2 z-[70] -translate-y-1/2 sm:left-4 lg:left-6">
              <StoreQrButton
                storeId={store.id}
                storeName={store.name}
                storeSlug={store.slug}
                logoUrl={store.logoUrl}
                primaryColor={store.primaryColor}
                themeOverrides={store.themeOverrides}
                variant="icon"
              />
            </div>
          ) : null}
        </header>

        <main className="dashboard-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pt-8 lg:pb-32">
          {children}
        </main>
        {overlay}
      </div>
    </div>
  );
}

function PlanOfferBadge({
  subscription,
  t,
}: {
  subscription: Subscription;
  t: ReturnType<typeof createTranslator>;
}) {
  const endAt = subscription.planId === "trial" ? subscription.trialEndsAt : subscription.currentPeriodEnd;
  const days = remainingDays(endAt);
  const discount = Math.round(EARLY_BIRD_DISCOUNT * 100);
  const expired = !isSubscriptionUsable(subscription);

  return (
    <span
      className={
        expired
          ? "max-w-[7rem] rounded-xl bg-red-50 px-2 py-1 text-center text-[10px] font-bold leading-tight text-red-700"
          : "max-w-[7rem] rounded-xl bg-amber-50 px-2 py-1 text-center text-[10px] font-bold leading-tight text-amber-800"
      }
    >
      {expired
        ? t("offerBadgeFree")
        : subscription.planId === "trial"
          ? t("offerBadge", { discount, days })
          : t("offerBadgeDays", { days })}
    </span>
  );
}

function remainingDays(endAt: string | null): number {
  if (!endAt) return 0;
  return Math.max(0, Math.ceil((Date.parse(endAt) - Date.now()) / 86_400_000));
}
