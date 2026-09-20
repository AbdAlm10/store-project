import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { buttonVariants } from "@/components/ui/button";
import { PLANS, type PlanId } from "@/config/plans";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { buildSubscriptionWhatsAppUrl } from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
};

const PLAN_LABEL_KEY: Record<PlanId, MessageKey> = {
  trial: "planTrial",
  basic: "planBasic",
  pro: "planPro",
};

export default async function SubscriptionPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const subscription = await services.entitlements.getSubscription(store.id);
  const plan = PLANS[subscription.planId];
  const planLabel = t(PLAN_LABEL_KEY[subscription.planId]);
  const productCount = await services.products
    .listForMerchant(store.id, { pageSize: 1 })
    .then((result) => result.total);

  const proWhatsAppUrl = buildSubscriptionWhatsAppUrl({
    storeName: store.name,
    storeSlug: store.slug,
    intent: "pro",
  });
  const basicWhatsAppUrl = buildSubscriptionWhatsAppUrl({
    storeName: store.name,
    storeSlug: store.slug,
    intent: "basic",
  });
  const isPro = subscription.planId === "pro";
  const showBasicCta = subscription.planId === "trial";

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscription")} />
      <DashboardCard>
        <p className="text-sm text-slate-400">{t("currentPlan")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {planLabel}
        </p>
        <p className="mt-2 text-sm capitalize text-slate-500">
          {t("statusLabel", { status: subscription.status })}
        </p>
        {subscription.trialEndsAt ? (
          <p className="mt-1 text-sm text-slate-500">
            {t("trialEnds", {
              date: new Date(subscription.trialEndsAt).toLocaleDateString(locale),
            })}
          </p>
        ) : null}
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <UsageCard
            label={t("products")}
            value={
              Number.isFinite(plan.limits.maxProducts)
                ? `${productCount} / ${plan.limits.maxProducts}`
                : `${productCount} / ∞`
            }
          />
          <UsageCard
            label={t("imagesPerProduct")}
            value={`${plan.limits.maxImagesPerProduct}`}
          />
          <UsageCard
            label={t("advancedAnalytics")}
            value={
              plan.limits.advancedAnalytics ? t("included") : t("basicOnly")
            }
          />
        </div>
        {plan.priceYearlyUsd > 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {t("subscriptionPricing", {
              monthly: plan.priceMonthlyUsd,
              yearly: plan.priceYearlyUsd,
            })}
          </p>
        ) : null}
        <div className="mt-6 flex flex-wrap items-center gap-3">
          {showBasicCta ? (
            <Link
              href={basicWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "outline" }))}
            >
              {t("subscribeBasicWhatsApp")}
            </Link>
          ) : null}
          {!isPro ? (
            <Link
              href={proWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "whatsapp" }))}
            >
              {t("upgradeToPro")}
            </Link>
          ) : (
            <p className="text-sm font-medium text-brand-700">
              {t("alreadyOnPro")}
            </p>
          )}
          <p className="w-full text-xs text-slate-400 sm:w-auto">
            {t("stripeNotConfigured")}
          </p>
        </div>
      </DashboardCard>
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#eef8f2] px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
