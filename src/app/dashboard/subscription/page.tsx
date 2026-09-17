import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PLANS, type PlanId } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";

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

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscription")} description={t("subscriptionDesc")} />
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
            value={`${productCount} / ${plan.limits.maxProducts}`}
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
        <div className="mt-6 flex flex-wrap gap-3">
          <Button disabled title={t("connectStripe")}>
            {t("upgradeToPro")}
          </Button>
          <p className="self-center text-xs text-slate-400">
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
