import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { PLANS } from "@/config/plans";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/dashboard/page-header";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Subscription",
  robots: { index: false, follow: false },
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
  const productCount = await services.products
    .listForMerchant(store.id, { pageSize: 1 })
    .then((result) => result.total);

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscription")} description={t("subscriptionDesc")} />
      <div className="rounded-3xl bg-white p-6 ring-1 ring-slate-200">
        <p className="text-sm text-slate-500">{t("currentPlan")}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900">{plan.name}</p>
        <p className="mt-2 text-sm capitalize text-slate-600">
          {t("statusLabel", { status: subscription.status })}
        </p>
        {subscription.trialEndsAt ? (
          <p className="mt-1 text-sm text-slate-600">
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
          <p className="self-center text-xs text-slate-500">
            {t("stripeNotConfigured")}
          </p>
        </div>
      </div>
    </div>
  );
}

function UsageCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}
