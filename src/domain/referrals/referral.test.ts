import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { REFERRAL_REWARD_DAYS } from "@/domain/billing/period";
import {
  ReferralBook,
  type ReferralSubscriptionSnapshot,
} from "@/domain/referrals/book";
import { contactIdentity, normalizePhone } from "@/domain/referrals/normalize";
import {
  REFERRAL_CODE_PATTERN,
  generateReferralCode,
} from "@/lib/referrals/cookie";
import { showsDukkanStorefrontBadge } from "@/domain/storefront/badge";

const now = new Date("2026-03-01T00:00:00.000Z");

function paidSub(
  partial: Partial<ReferralSubscriptionSnapshot> = {},
): ReferralSubscriptionSnapshot {
  return {
    id: "sub-referred",
    storeId: "store-referred",
    ownerId: "user-referred",
    planId: "basic",
    status: "active",
    trialEndsAt: null,
    currentPeriodEnd: "2026-04-01T00:00:00.000Z",
    storeStatus: "published",
    suspendedAt: null,
    updatedAt: now.toISOString(),
    ...partial,
  };
}

describe("contact normalization", () => {
  it("treats local, 00, and +963 numbers as the same phone", () => {
    expect(normalizePhone("0944111222")).toBe("963944111222");
    expect(normalizePhone("00963944111222")).toBe("963944111222");
    expect(normalizePhone("+963 944 111 222")).toBe("963944111222");
    expect(normalizePhone("963944111222")).toBe("963944111222");
  });
});

describe("referral ledger", () => {
  it("issues a unique non-guessable code", () => {
    const book = new ReferralBook();
    const codes = new Set<string>();
    for (let i = 0; i < 20; i += 1) {
      codes.add(book.ensureCode(`user-${i}`, now));
    }
    expect(codes.size).toBe(20);
    for (const code of codes) {
      expect(REFERRAL_CODE_PATTERN.test(code)).toBe(true);
      expect(code.length).toBeGreaterThanOrEqual(16);
    }
    expect(REFERRAL_CODE_PATTERN.test(generateReferralCode())).toBe(true);
  });

  it("rejects self-referral and does not keep a rewardable row", () => {
    const book = new ReferralBook();
    const code = book.ensureCode("user-a", now);
    const identity = contactIdentity(["a@shop.test"], ["0944111222"]);
    const result = book.attach({
      referredUserId: "user-a",
      code,
      referrerIdentity: identity,
      referredIdentity: identity,
      now,
    });
    expect(result).toBe("rejected");
    expect(book.referralFor("user-a")).toBeNull();
    expect(book.audit.some((event) => event.detail.reason === "self")).toBe(true);
  });

  it("rejects a second account with the same email or phone", () => {
    const book = new ReferralBook();
    const code = book.ensureCode("referrer", now);
    const email = book.attach({
      referredUserId: "referred",
      code,
      referrerIdentity: contactIdentity(["Same@Shop.test"], ["111"]),
      referredIdentity: contactIdentity([" same@shop.test "], ["222"]),
      now,
    });
    expect(email).toBe("rejected");
    expect(book.referralFor("referred")?.rejectReason).toBe("duplicate_email");

    const phones = new ReferralBook();
    const phoneCode = phones.ensureCode("referrer", now);
    const phone = phones.attach({
      referredUserId: "referred",
      code: phoneCode,
      referrerIdentity: contactIdentity(["a@shop.test"], ["00963944111222"]),
      referredIdentity: contactIdentity(["b@shop.test"], ["0944111222"]),
      now,
    });
    expect(phone).toBe("rejected");
    expect(phones.referralFor("referred")?.status).toBe("rejected");
  });

  it("rewards both merchants once, then ignores a second activation", () => {
    const book = new ReferralBook();
    const code = book.ensureCode("referrer", now);
    expect(
      book.attach({
        referredUserId: "referred",
        code,
        referrerIdentity: contactIdentity(["a@shop.test"], ["111"]),
        referredIdentity: contactIdentity(["b@shop.test"], []),
        now,
      }),
    ).toBe("pending");

    const referrerSub = paidSub({
      id: "sub-referrer",
      storeId: "store-referrer",
      ownerId: "referrer",
      planId: "pro",
      currentPeriodEnd: "2026-05-01T00:00:00.000Z",
    });
    const first = book.grant({
      referredUserId: "referred",
      storeId: "store-referred",
      referredIdentity: contactIdentity(["b@shop.test"], ["0944000000"]),
      referrerIdentity: contactIdentity(["a@shop.test"], ["111"]),
      referredSubscription: paidSub({ ownerId: "referred" }),
      referrerSubscription: referrerSub,
      now,
    });
    expect(first.status).toBe("rewarded");
    expect(first.patches).toHaveLength(2);
    expect(first.patches[0]?.currentPeriodEnd).toBe("2026-05-01T00:00:00.000Z");
    expect(first.patches[1]?.currentPeriodEnd).toBe("2026-05-31T00:00:00.000Z");
    expect(book.rewards).toHaveLength(2);
    expect(book.rewards.every((row) => row.days === REFERRAL_REWARD_DAYS)).toBe(true);

    const second = book.grant({
      referredUserId: "referred",
      storeId: "store-referred",
      referredIdentity: contactIdentity(["b@shop.test"], ["0944000000"]),
      referrerIdentity: contactIdentity(["a@shop.test"], ["111"]),
      referredSubscription: paidSub({
        ownerId: "referred",
        currentPeriodEnd: first.patches[0]?.currentPeriodEnd ?? null,
      }),
      referrerSubscription: referrerSub,
      now,
    });
    expect(second.status).toBe("already_rewarded");
    expect(second.patches).toHaveLength(0);
    expect(book.rewards).toHaveLength(2);
    expect(book.audit.some((event) => event.eventType === "reward_granted")).toBe(true);
    expect(book.audit.some((event) => event.eventType === "reward_already")).toBe(true);
  });

  it("does not reward a trial or a matching phone discovered after signup", () => {
    const book = new ReferralBook();
    const code = book.ensureCode("referrer", now);
    book.attach({
      referredUserId: "referred",
      code,
      referrerIdentity: contactIdentity(["a@shop.test"], []),
      referredIdentity: contactIdentity(["b@shop.test"], []),
      now,
    });
    const trial = book.grant({
      referredUserId: "referred",
      storeId: "store-referred",
      referredIdentity: contactIdentity(["b@shop.test"], []),
      referrerIdentity: contactIdentity(["a@shop.test"], []),
      referredSubscription: paidSub({ ownerId: "referred", planId: "trial", status: "trialing" }),
      referrerSubscription: null,
      now,
    });
    expect(trial.status).toBe("skipped");
    expect(book.rewards).toHaveLength(0);

    const blocked = book.grant({
      referredUserId: "referred",
      storeId: "store-referred",
      referredIdentity: contactIdentity(["b@shop.test"], ["0944111222"]),
      referrerIdentity: contactIdentity(["a@shop.test"], ["+963944111222"]),
      referredSubscription: paidSub({ ownerId: "referred" }),
      referrerSubscription: null,
      now,
    });
    expect(blocked.status).toBe("rejected");
    expect(book.rewards).toHaveLength(0);
    expect(book.referralFor("referred")?.status).toBe("rejected");
  });

  it("ignores a second referral code for the same merchant", () => {
    const book = new ReferralBook();
    const first = book.ensureCode("referrer-a", now);
    const second = book.ensureCode("referrer-b", now);
    book.attach({
      referredUserId: "referred",
      code: first,
      referrerIdentity: contactIdentity(["a@shop.test"], []),
      referredIdentity: contactIdentity(["c@shop.test"], []),
      now,
    });
    const again = book.attach({
      referredUserId: "referred",
      code: second,
      referrerIdentity: contactIdentity(["b@shop.test"], []),
      referredIdentity: contactIdentity(["c@shop.test"], []),
      now,
    });
    expect(again).toBe("ignored");
    expect(book.referralFor("referred")?.referrerUserId).toBe("referrer-a");
  });
});

describe("referral migration", () => {
  const sql = readFileSync("supabase/migrations/20261012000000_referrals.sql", "utf8");

  it("keeps rewards server-side with a unique constraint and an audit log", () => {
    expect(sql).toContain("referred_user_id uuid not null unique");
    expect(sql).toContain("constraint referral_rewards_once unique (referral_id, beneficiary_user_id)");
    expect(sql).toContain("constraint referrals_not_self");
    expect(sql).toContain("create table if not exists public.referral_audit_log");
    expect(sql).toContain("security definer");
    expect(sql).toContain("for update");
    expect(sql).toContain("revoke all on public.referral_codes from anon, authenticated");
    expect(sql).toContain("revoke all on public.referrals from anon, authenticated");
    expect(sql).toContain("revoke all on public.referral_rewards from anon, authenticated");
    expect(sql).toContain(
      "revoke all on function public.grant_referral_month(uuid, uuid) from public, anon, authenticated",
    );
    expect(sql).toContain(
      "grant execute on function public.grant_referral_month(uuid, uuid) to service_role",
    );
    expect(sql.includes("grant insert on public.referrals to authenticated")).toBe(false);
    expect(sql.includes("grant insert on public.referral_rewards to authenticated")).toBe(false);
    expect(sql).toContain("duplicate_email");
    expect(sql).toContain("duplicate_phone");
    expect(sql).toContain("already_rewarded");
    expect(sql).toContain("extensions.gen_random_bytes(24)");
  });
});

describe("storefront badge", () => {
  it("shows on basic and trial and stays off Pro", () => {
    expect(showsDukkanStorefrontBadge("free")).toBe(true);
    expect(showsDukkanStorefrontBadge("basic")).toBe(false);
    expect(showsDukkanStorefrontBadge("trial")).toBe(false);
    expect(showsDukkanStorefrontBadge(null)).toBe(true);
    expect(showsDukkanStorefrontBadge("pro")).toBe(false);
  });
});
