import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { formatUsd, getPlan, type PlanId } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import { SUBSCRIPTION_STATUS_AR } from "@/features/admin/labels";
import { demoProducts, demoSubscription } from "@/features/demo/catalog";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";

export const metadata = {
  title: "الاشتراك",
  robots: { index: false, follow: false },
};

const PLAN_LABEL_KEY: Record<PlanId, MessageKey> = {
  free: "planFree",
  trial: "planTrial",
  basic: "planBasic",
  pro: "planPro",
};

export default async function DemoSubscriptionPage() {
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const shownPlanId = effectivePlanId(demoSubscription);
  const plan = getPlan(shownPlanId);
  const planLabel = t(PLAN_LABEL_KEY[shownPlanId]);
  const productCount = demoProducts().length;
  const subscriptionIsUsable = isSubscriptionUsable(demoSubscription);

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscription")} />
      <DashboardCard>
        <p className="text-sm text-slate-400">{t("currentPlan")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{planLabel}</p>
        <p className="mt-2 text-sm text-slate-500">
          {t("statusLabel", {
            status: subscriptionIsUsable
              ? (SUBSCRIPTION_STATUS_AR[demoSubscription.status] ?? demoSubscription.status)
              : t("expired"),
          })}
        </p>
        {demoSubscription.currentPeriodEnd ? (
          <p className="mt-1 text-sm text-slate-500">
            {t("periodEnds", {
              date: new Date(demoSubscription.currentPeriodEnd).toLocaleDateString(locale),
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
          <UsageCard label={t("imagesPerProduct")} value={`${plan.limits.maxImagesPerProduct}`} />
          <UsageCard
            label={t("advancedAnalytics")}
            value={plan.limits.analytics === "advanced" ? t("included") : t("planFeatVisitsOnly")}
          />
        </div>
        {plan.priceYearlyUsd > 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            {t("subscriptionPricing", {
              monthly: formatUsd(plan.priceMonthlyUsd),
              yearly: formatUsd(plan.priceYearlyUsd),
            })}
          </p>
        ) : null}
        <p className="mt-6 text-sm font-medium text-brand-700">{t("alreadyOnPro")}</p>
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
