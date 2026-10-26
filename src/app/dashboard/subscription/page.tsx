import { PageHeader } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { buttonVariants } from "@/components/ui/button";
import { appConfig } from "@/config/app";
import { earlyBirdPrice, formatUsd, getPlan, type PlanId } from "@/config/plans";
import { effectivePlanId } from "@/domain/plans/access";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { getServices } from "@/infrastructure/container";
import { claimEarlyBirdForMerchant } from "@/infrastructure/billing/early-bird-ledger";
import { buildSubscriptionWhatsAppUrl } from "@/lib/social/sharing";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import { SUBSCRIPTION_STATUS_AR } from "@/features/admin/labels";
import { CopyReferralLink } from "@/features/dashboard/copy-referral-link";
import { cn } from "@/lib/utils/cn";
import Link from "next/link";
import { redirect } from "next/navigation";

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

export default async function SubscriptionPage() {
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);
  const subscription = await services.entitlements.getSubscription(store.id);
  const shownPlanId = effectivePlanId(subscription);
  const plan = getPlan(shownPlanId);
  const planLabel = t(PLAN_LABEL_KEY[shownPlanId]);
  const productCount = await services.products
    .listForMerchant(store.id, { pageSize: 1 })
    .then((result) => result.total);

  const subscriptionIsUsable = isSubscriptionUsable(subscription);
  let earlyBird = false;
  try {
    const { profile } = await services.auth.requireProfile();
    earlyBird = await claimEarlyBirdForMerchant({
      userId: profile.id,
      storeId: store.id,
    });
  } catch (error) {
    console.error("early-bird claim failed", error);
  }
  const proWhatsAppUrl = buildSubscriptionWhatsAppUrl({
    storeName: store.name,
    storeSlug: store.slug,
    intent: "pro",
    mode: subscription.planId === "pro" && !subscriptionIsUsable ? "renew" : "subscribe",
    earlyBird,
  });
  const basicWhatsAppUrl = buildSubscriptionWhatsAppUrl({
    storeName: store.name,
    storeSlug: store.slug,
    intent: "basic",
    mode: subscription.planId === "basic" && !subscriptionIsUsable ? "renew" : "subscribe",
    earlyBird,
  });
  const isPro = subscription.planId === "pro";
  const expired = !subscriptionIsUsable;
  const showBasicCta = subscription.planId === "trial" || (expired && subscription.planId === "basic");
  const showProCta = !isPro || expired;

  let referral: Awaited<ReturnType<typeof services.referrals.getMerchantView>> | null = null;
  try {
    const { profile } = await services.auth.requireProfile();
    referral = await services.referrals.getMerchantView(profile.id);
  } catch (error) {
    console.error("referral view failed", error);
  }
  const referralUrl = referral ? `${appConfig.url}/register?ref=${referral.code}` : null;
  const pendingCount = referral?.items.filter((item) => item.status === "pending").length ?? 0;
  const rewardedCount = referral?.items.filter((item) => item.status === "rewarded").length ?? 0;
  const referralStatusLabel: Record<string, MessageKey> = {
    pending: "referralStatusPending",
    rewarded: "referralStatusRewarded",
    rejected: "referralStatusRejected",
  };

  return (
    <div className="space-y-6">
      <PageHeader title={t("subscription")} />
      <DashboardCard>
        <p className="text-sm text-slate-400">{t("currentPlan")}</p>
        <p className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
          {planLabel}
        </p>
        <p className="mt-2 text-sm text-slate-500">
          {t("statusLabel", {
            status: subscriptionIsUsable
              ? (SUBSCRIPTION_STATUS_AR[subscription.status] ?? subscription.status)
              : t("expired"),
          })}
        </p>
        {subscription.trialEndsAt && subscription.planId === "trial" ? (
          <p className="mt-1 text-sm text-slate-500">
            {t("trialEnds", {
              date: new Date(subscription.trialEndsAt).toLocaleDateString(locale),
            })}
          </p>
        ) : null}
        {subscription.currentPeriodEnd && subscription.planId !== "trial" ? (
          <p className="mt-1 text-sm text-slate-500">
            {t("periodEnds", {
              date: new Date(subscription.currentPeriodEnd).toLocaleDateString(locale),
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
              plan.limits.analytics === "advanced"
                ? t("included")
                : plan.limits.analytics === "engagement"
                  ? t("planFeatEngagementAnalytics")
                  : t("planFeatVisitsOnly")
            }
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
        {earlyBird ? (
          <p className="mt-2 text-sm font-medium text-brand-800">
            {t("subscriptionEarlyBird", {
              basicMonthly: formatUsd(earlyBirdPrice("basic", "monthly")),
              basicYearly: formatUsd(earlyBirdPrice("basic", "yearly")),
              proMonthly: formatUsd(earlyBirdPrice("pro", "monthly")),
              proYearly: formatUsd(earlyBirdPrice("pro", "yearly")),
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
              {expired && subscription.planId === "basic"
                ? t("renewSubscriptionWhatsApp")
                : t("subscribeBasicWhatsApp")}
            </Link>
          ) : null}
          {showProCta ? (
            <Link
              href={proWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: "whatsapp" }))}
            >
              {isPro ? t("renewSubscriptionWhatsApp") : t("upgradeToPro")}
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
      {referral && referralUrl ? (
        <DashboardCard>
          <h2 className="text-base font-semibold text-slate-900">{t("referralTitle")}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-500">{t("referralBody")}</p>
          <p className="mt-4 text-xs text-slate-400">{t("referralLinkLabel")}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <input
              readOnly
              value={referralUrl}
              className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700"
              aria-label={t("referralLinkLabel")}
            />
            <CopyReferralLink
              url={referralUrl}
              copyLabel={t("referralCopy")}
              copiedLabel={t("referralCopied")}
            />
          </div>
          <p className="mt-4 text-sm text-slate-600">
            {t("referralPending", { count: pendingCount })}
            {" · "}
            {t("referralRewarded", { count: rewardedCount })}
          </p>
          {referral.items.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">{t("referralEmpty")}</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {referral.items.map((item) => (
                <li
                  key={`${item.referredUserId}-${item.createdAt}`}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate text-slate-700">{item.email || "—"}</span>
                  <span className="shrink-0 text-slate-500">
                    {t(referralStatusLabel[item.status] ?? "referralStatusPending")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </DashboardCard>
      ) : null}
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
