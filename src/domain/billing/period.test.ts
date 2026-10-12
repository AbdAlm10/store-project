import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { earlyBirdPrice, PLANS, TRIAL_DAYS, yearlySavingsPercent } from "@/config/plans";
import { nextPeriodEnd, PAID_MONTH_DAYS, PAID_YEAR_DAYS } from "@/domain/billing/period";
import { buildSubscriptionWhatsAppUrl } from "@/lib/social/sharing";
import { t } from "@/i18n/messages";

const DAY = 24 * 60 * 60 * 1000;

describe("plan prices", () => {
  it("uses the Sham Cash price list", () => {
    expect(PLANS.basic.priceMonthlyUsd).toBe(7);
    expect(PLANS.basic.priceYearlyUsd).toBe(50);
    expect(PLANS.pro.priceMonthlyUsd).toBe(15);
    expect(PLANS.pro.priceYearlyUsd).toBe(150);
    expect(TRIAL_DAYS).toBe(10);
    const source = readFileSync("src/config/plans.ts", "utf8");
    expect(source.includes("$95")).toBe(false);
    expect(source.includes("$210")).toBe(false);
    expect(t("ar", "faq3A")).toContain("50$");
  });

  it("keeps the early-bird rate and shows the exact discounted price", () => {
    expect(earlyBirdPrice("pro", "monthly")).toBe(10.5);
    expect(earlyBirdPrice("basic", "monthly")).toBe(6.65);
    expect(earlyBirdPrice("pro", "yearly")).toBe(105);
    expect(earlyBirdPrice("basic", "yearly")).toBe(47.5);
  });

  it("computes yearly savings from the listed prices", () => {
    expect(yearlySavingsPercent(PLANS.basic)).toBe(40);
    expect(yearlySavingsPercent(PLANS.pro)).toBe(17);
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
    expect(basic).toContain("7$");
    expect(basic).toContain("50$");

    const pro = decodeURIComponent(
      buildSubscriptionWhatsAppUrl({
        storeName: "النور",
        storeSlug: "alnoor",
        intent: "pro",
        mode: "renew",
      }).split("text=")[1] ?? "",
    );
    expect(pro).toContain("15$");
    expect(pro).toContain("150$");
    expect(pro).toContain("تجديد");
  });
});
