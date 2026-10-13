import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { earlyBirdPrice, PLANS, TRIAL_DAYS, yearlySavingsPercent } from "@/config/plans";
import { nextPeriodEnd, PAID_MONTH_DAYS, PAID_YEAR_DAYS } from "@/domain/billing/period";
import { buildSubscriptionWhatsAppUrl } from "@/lib/social/sharing";
import { t } from "@/i18n/messages";

const DAY = 24 * 60 * 60 * 1000;

describe("plan prices", () => {
  it("uses the Sham Cash price list", () => {
    expect(PLANS.basic.priceMonthlyUsd).toBe(4);
    expect(PLANS.basic.priceYearlyUsd).toBe(40);
    expect(PLANS.basic.limits.maxProducts).toBe(150);
    expect(PLANS.basic.limits.maxCategories).toBe(10);
    expect(PLANS.basic.limits.advancedAnalytics).toBe(false);
    expect(PLANS.basic.limits.customDomain).toBe(false);
    expect(PLANS.pro.priceMonthlyUsd).toBe(9);
    expect(PLANS.pro.priceYearlyUsd).toBe(90);
    expect(PLANS.pro.limits.maxProducts).toBe(1000);
    expect(PLANS.pro.limits.advancedAnalytics).toBe(true);
    expect(PLANS.pro.limits.customDomain).toBe(true);
    expect(TRIAL_DAYS).toBe(10);
    const source = readFileSync("src/config/plans.ts", "utf8");
    expect(source.includes("$95")).toBe(false);
    expect(source.includes("$210")).toBe(false);
    const faq = t("ar", "faq3A");
    expect(faq).toContain("4$");
    expect(faq).toContain("40$");
    expect(faq).toContain("9$");
    expect(faq).toContain("90$");
    expect(faq).toContain("3$");
    expect(faq).toContain("30$");
    expect(faq).toContain("6.75$");
    expect(faq).toContain("67.5$");
    expect(faq).not.toContain("7$");
    expect(faq).not.toContain("15$");
    expect(faq).not.toContain("50$");
    expect(faq).not.toContain("150$");
  });

  it("gives the first 100 merchants 25% off the first year", () => {
    expect(earlyBirdPrice("basic", "monthly")).toBe(3);
    expect(earlyBirdPrice("basic", "yearly")).toBe(30);
    expect(earlyBirdPrice("pro", "monthly")).toBe(6.75);
    expect(earlyBirdPrice("pro", "yearly")).toBe(67.5);
  });

  it("computes yearly savings from the listed prices", () => {
    expect(yearlySavingsPercent(PLANS.basic)).toBe(17);
    expect(yearlySavingsPercent(PLANS.pro)).toBe(17);
  });

  it("gives the free trial exactly the Basic entitlements", () => {
    expect(PLANS.trial.limits).toEqual(PLANS.basic.limits);
    expect(PLANS.trial.priceMonthlyUsd).toBe(0);
    expect(PLANS.trial.priceYearlyUsd).toBe(0);
    expect(t("ar", "pricingBody")).toContain("الأساسية فقط");
    expect(t("ar", "faq4A")).toContain("الأساسية فقط");
    expect(t("ar", "pricingBody")).not.toContain("تحليلات وتخصيص");
    expect(t("ar", "faq4A")).not.toContain("تحليلات Pro");
  });
});

describe("subscription period end", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("starts a trial at 10 days from now", () => {
    const end = nextPeriodEnd({
      now,
      planId: "trial",
      billingPeriod: "monthly",
      previous: null,
    });
    expect(end.getTime() - now.getTime()).toBe(TRIAL_DAYS * DAY);
  });

  it("starts a paid month from now when the previous period has ended", () => {
    const end = nextPeriodEnd({
      now,
      planId: "basic",
      billingPeriod: "monthly",
      previous: {
        planId: "basic",
        currentPeriodEnd: "2025-12-01T00:00:00.000Z",
      },
    });
    expect(end.getTime() - now.getTime()).toBe(PAID_MONTH_DAYS * DAY);
  });

  it("extends a live paid period instead of restarting it", () => {
    const current = "2026-01-20T00:00:00.000Z";
    const end = nextPeriodEnd({
      now,
      planId: "basic",
      billingPeriod: "monthly",
      previous: { planId: "basic", currentPeriodEnd: current },
    });
    expect(end.toISOString()).toBe("2026-02-19T00:00:00.000Z");
  });

  it("stacks a yearly renewal on the remaining paid end", () => {
    const end = nextPeriodEnd({
      now,
      planId: "pro",
      billingPeriod: "yearly",
      previous: {
        planId: "pro",
        currentPeriodEnd: "2026-02-01T00:00:00.000Z",
      },
    });
    expect(end.getTime() - Date.parse("2026-02-01T00:00:00.000Z")).toBe(PAID_YEAR_DAYS * DAY);
  });

  it("does not stack a paid plan on top of a trial end", () => {
    const end = nextPeriodEnd({
      now,
      planId: "basic",
      billingPeriod: "monthly",
      previous: {
        planId: "trial",
        currentPeriodEnd: "2026-06-01T00:00:00.000Z",
      },
    });
    expect(end.getTime() - now.getTime()).toBe(PAID_MONTH_DAYS * DAY);
  });
});

describe("Sham Cash instructions", () => {
  it("puts the price and Sham Cash in the WhatsApp message", () => {
    const basic = decodeURIComponent(
      buildSubscriptionWhatsAppUrl({
        storeName: "النور",
        storeSlug: "alnoor",
        intent: "basic",
      }).split("text=")[1] ?? "",
    );
    expect(basic).toContain("شام كاش");
    expect(basic).toContain("4$");
    expect(basic).toContain("40$");
    expect(basic).not.toContain("7$");

    const pro = decodeURIComponent(
      buildSubscriptionWhatsAppUrl({
        storeName: "النور",
        storeSlug: "alnoor",
        intent: "pro",
        mode: "renew",
      }).split("text=")[1] ?? "",
    );
    expect(pro).toContain("9$");
    expect(pro).toContain("90$");
    expect(pro).toContain("تجديد");
    expect(pro).not.toContain("15$");

    const early = decodeURIComponent(
      buildSubscriptionWhatsAppUrl({
        storeName: "النور",
        storeSlug: "alnoor",
        intent: "pro",
        earlyBird: true,
      }).split("text=")[1] ?? "",
    );
    expect(early).toContain("6.75$");
    expect(early).toContain("67.5$");
    expect(early).toContain("25%");
    expect(early).toContain("السنة الأولى");
  });
});
