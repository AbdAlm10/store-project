"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { useState } from "react";
import {
  EARLY_BIRD_DISCOUNT,
  PLANS,
  TRIAL_DAYS,
  earlyBirdPrice,
  planPrice,
  type BillingPeriod,
  type PlanId,
} from "@/config/plans";
import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/marketing/reveal";
import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";

type FeatureLine = {
  key: MessageKey;
  vars?: Record<string, string | number>;
  included: boolean;
};

function featuresFor(planId: PlanId): FeatureLine[] {
  const basic = PLANS.basic.limits;
  const pro = PLANS.pro.limits;

  switch (planId) {
    case "trial":
      return [
        { key: "planFeatFullAnalytics", included: true },
        { key: "planFeatUnlimitedOptions", included: true },
        { key: "planFeatFullCustomization", included: true },
        { key: "planFeatSupport24", included: true },
        {
          key: "planFeatTrialDays",
          vars: { days: TRIAL_DAYS },
          included: true,
        },
        { key: "planFeatEarlyBird", included: true },
      ];
    case "basic":
      return [
        {
          key: "planFeatProductsImages",
          vars: {
            products: basic.maxProducts,
            images: basic.maxImagesPerProduct,
          },
          included: true,
        },
        { key: "planFeatNoAnalytics", included: false },
        {
          key: "planFeatCategories",
          vars: { count: basic.maxCategories },
          included: true,
        },
        {
          key: "planFeatOptions",
          vars: { count: basic.maxOptionsPerProduct },
          included: true,
        },
        { key: "planFeatOneNavAction", included: true },
        { key: "planFeatLimitedColors", included: true },
        { key: "planFeatNoSupport", included: false },
      ];
    case "pro":
      return [
        {
          key: "planFeatProducts",
          vars: { count: pro.maxProducts },
          included: true,
        },
        { key: "planFeatFullAnalytics", included: true },
        { key: "planFeatUnlimitedCategories", included: true },
        { key: "planFeatUnlimitedOptions", included: true },
        { key: "planFeatAllNavActions", included: true },
        { key: "planFeatFullCustomization", included: true },
        { key: "planFeatSupport24", included: true },
      ];
  }
}

const PLAN_NAME_KEY: Record<PlanId, MessageKey> = {
  trial: "planTrial",
  basic: "planBasic",
  pro: "planPro",
};

const PLAN_DESC_KEY: Record<PlanId, MessageKey> = {
  trial: "planTrialDesc",
  basic: "planBasicDesc",
  pro: "planProDesc",
};

export function PricingSection() {
  const { t } = useI18n();
  const [period, setPeriod] = useState<BillingPeriod>("monthly");

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6" id="pricing">
      <Reveal>
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            {t("pricingTitle")}
          </h2>
          <p className="mt-4 text-lg text-slate-500">{t("pricingBody")}</p>
        </div>
      </Reveal>

      <Reveal delayMs={40}>
        <div className="mt-8 flex justify-center">
          <div
            className="inline-flex rounded-full bg-slate-100 p-1"
            role="group"
            aria-label={t("billingPeriod")}
          >
            <PeriodButton
              active={period === "monthly"}
              onClick={() => setPeriod("monthly")}
              label={t("billingMonthly")}
            />
            <PeriodButton
              active={period === "yearly"}
              onClick={() => setPeriod("yearly")}
              label={t("billingYearly")}
              badge={t("billingYearlySave")}
            />
          </div>
        </div>
      </Reveal>

      <Reveal delayMs={80}>
        <p className="mx-auto mt-5 max-w-xl text-center text-sm text-slate-500">
          {t("earlyBirdBanner", {
            trialDays: TRIAL_DAYS,
            proPercent: Math.round(EARLY_BIRD_DISCOUNT.pro * 100),
            basicPercent: Math.round(EARLY_BIRD_DISCOUNT.basic * 100),
          })}
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 lg:grid-cols-3">
        {(Object.keys(PLANS) as PlanId[]).map((planId, index) => {
          const plan = PLANS[planId];
          const features = featuresFor(planId);
          const highlighted = Boolean(plan.highlighted);
          const price = planPrice(plan, period);
          const bird =
            planId === "basic" || planId === "pro"
              ? earlyBirdPrice(planId, period)
              : null;

          return (
            <Reveal key={planId} delayMs={index * 90}>
              <article
                className={cn(
                  "flex h-full flex-col rounded-[1.75rem] p-6 transition duration-300 hover:-translate-y-1",
                  highlighted
                    ? "bg-slate-950 text-white shadow-[0_28px_70px_-36px_rgba(15,23,42,0.55)]"
                    : "bg-white text-slate-900 shadow-[var(--ys-landing-shadow)] ring-1 ring-slate-100",
                )}
              >
                <h3 className="text-xl font-semibold">
                  {t(PLAN_NAME_KEY[planId])}
                </h3>
                <p
                  className={cn(
                    "mt-2 text-sm",
                    highlighted ? "text-slate-300" : "text-slate-500",
                  )}
                >
                  {t(PLAN_DESC_KEY[planId])}
                </p>

                <div className="mt-6">
                  {price === 0 ? (
                    <p className="text-4xl font-semibold tracking-tight">
                      {t("free")}
                    </p>
                  ) : (
                    <>
                      <p className="text-4xl font-semibold tracking-tight">
                        ${formatPrice(price)}
                        <span className="text-base font-medium opacity-60">
                          {period === "yearly" ? t("perYear") : t("perMonth")}
                        </span>
                      </p>
                      {bird !== null && bird < price ? (
                        <p
                          className={cn(
                            "mt-2 text-sm font-medium",
                            highlighted ? "text-brand-300" : "text-brand-700",
                          )}
                        >
                          {t("earlyBirdPrice", {
                            price: formatPrice(bird),
                            period:
                              period === "yearly"
                                ? t("perYear")
                                : t("perMonth"),
                            percent: Math.round(
                              EARLY_BIRD_DISCOUNT[
                                planId === "basic" ? "basic" : "pro"
                              ] * 100,
                            ),
                          })}
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <ul className="mt-6 flex-1 space-y-2.5 text-sm">
                  {features.map((feature) => {
                    const Icon = feature.included ? Check : X;
                    return (
                      <li key={feature.key} className="flex gap-2">
                        <Icon
                          className={cn(
                            "mt-0.5 h-4 w-4 shrink-0",
                            feature.included
                              ? "text-brand-500"
                              : highlighted
                                ? "text-slate-500"
                                : "text-slate-300",
                          )}
                        />
                        <span
                          className={
                            feature.included
                              ? undefined
                              : highlighted
                                ? "text-slate-400"
                                : "text-slate-400"
                          }
                        >
                          {t(feature.key, feature.vars)}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <Link href="/register" className="mt-8 block">
                  <Button
                    className="w-full rounded-full"
                    variant={highlighted ? "primary" : "outline"}
                  >
                    {planId === "trial"
                      ? t("ctaStartTrial")
                      : t("ctaGetStarted")}
                  </Button>
                </Link>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

function PeriodButton({
  active,
  onClick,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2.5 text-sm font-semibold leading-none transition",
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800",
      )}
    >
      <span className="leading-none">{label}</span>
      {badge ? (
        <span className="inline-flex shrink-0 items-center rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-bold leading-none text-brand-800">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function formatPrice(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
