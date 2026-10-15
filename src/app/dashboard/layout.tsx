import { BrandLogo } from "@/components/brand/brand-logo";
import { DashboardPrefetch } from "@/components/dashboard/dashboard-prefetch";
import { MerchantNav } from "@/components/dashboard/merchant-nav";
import { logoutAction } from "@/features/auth/actions";
import { StoreQrButton } from "@/features/dashboard/store-qr-button";
import { SupportWidget } from "@/features/support/support-widget";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";
import { EARLY_BIRD_DISCOUNT, getPlan } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { Subscription } from "@/domain/types/entities";
import { getServices } from "@/infrastructure/container";
import {
  getDashboardProfile,
  getDashboardStores,
} from "@/lib/dashboard-request";
import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { redirect, unstable_rethrow } from "next/navigation";
import { isUnauthenticatedError } from "@/domain/errors";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let dashboardAuth: Awaited<ReturnType<typeof getDashboardProfile>>;
  try {
    dashboardAuth = await getDashboardProfile();
  } catch (error) {
    unstable_rethrow(error);
    if (isUnauthenticatedError(error)) redirect("/login");
    throw error;
  }
  if (!dashboardAuth.session.user.emailConfirmed) {
    redirect(
      `/auth/verify?email=${encodeURIComponent(dashboardAuth.session.user.email)}`,
    );
  }

  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const stores = await getDashboardStores().catch(() => []);
  const activeStore = stores[0];
  const services = getServices();
  const subscription = activeStore
    ? await services.entitlements.getSubscription(activeStore.id).catch(() => null)
    : null;
  const planLimits = subscription ? getPlan(effectivePlanId(subscription)).limits : null;
  const navLocked =
    activeStore?.status === "restricted" || activeStore?.status === "suspended";

  return (
    <div className="dashboard-shell grid h-dvh w-full overflow-hidden bg-white lg:grid-cols-[248px_minmax(0,1fr)]">
      <DashboardPrefetch />

      <aside className="relative z-10 hidden h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)] lg:flex">
        <div className="flex h-full min-h-0 min-w-0 flex-col px-3 py-5">
          <div className="mb-7 flex shrink-0 min-w-0 items-center gap-2 px-2">
            <Link
              href="/dashboard"
              className="flex min-w-0 items-center"
              aria-label="دكّان"
            >
              <BrandLogo
                variant="horizontal"
                className="h-11 w-auto max-w-full"
                priority
              />
            </Link>
            {subscription ? <PlanOfferBadge subscription={subscription} t={t} /> : null}
          </div>

          <div className="ys-scrollbar-none min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <MerchantNav
              storeName={activeStore?.name}
              locale={locale}
              embedded
              locked={navLocked}
            />
          </div>

          <div className="mt-4 shrink-0 space-y-1 border-t border-slate-100 px-1 pt-4">
            {activeStore ? (
              <Link
                href={`/${activeStore.slug}`}
                target="_blank"
                className="flex min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <ExternalLink className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{t("viewStore")}</span>
              </Link>
            ) : null}
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                <span className="truncate">{t("navSignOut")}</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden bg-white">
        <header className="relative z-50 shrink-0 border-b border-slate-100/80 bg-white px-4 py-2 sm:px-6 lg:px-8">
          <div className="flex h-10 items-center gap-3">
            <Link
              href="/dashboard"
              aria-label="دكّان"
              className="relative z-[60] min-w-0 lg:hidden"
            >
              <BrandLogo
                variant="horizontal"
                className="h-10 w-auto max-w-[9.5rem]"
                priority
              />
            </Link>

            <div className="relative z-[60] ms-auto flex items-center gap-1.5 pe-11 lg:pe-0">
              <div className="lg:hidden">
                <MerchantNav
                  locale={locale}
                  compact
                  locked={navLocked}
                />
              </div>
            </div>
          </div>

          {activeStore && planLimits?.qr ? (
            <div className="absolute left-3 top-1/2 z-[70] -translate-y-1/2 sm:left-4 lg:left-6">
              <StoreQrButton
                storeId={activeStore.id}
                storeName={activeStore.name}
                storeSlug={activeStore.slug}
                logoUrl={activeStore.logoUrl}
                primaryColor={activeStore.primaryColor}
                themeOverrides={activeStore.themeOverrides}
                variant="icon"
              />
            </div>
          ) : null}
        </header>

        <main className="dashboard-main min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-4 pt-6 pb-24 sm:px-6 sm:pb-28 lg:px-8 lg:pt-8 lg:pb-32">
          {children}
        </main>

        <SupportWidget storeId={activeStore?.id ?? null} />
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
  const endAt =
    subscription.planId === "trial"
      ? subscription.trialEndsAt
      : subscription.currentPeriodEnd;
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
  return Math.max(0, Math.ceil((Date.parse(endAt) - new Date().getTime()) / 86_400_000));
}
