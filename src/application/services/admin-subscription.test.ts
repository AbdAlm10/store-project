import { describe, expect, it } from "vitest";
import type { AuthService } from "@/application/services/auth-service";
import { AdminPlatformService } from "@/application/services/admin-platform-service";
import type {
  AdminStoreRow,
  PlatformAdminRepository,
} from "@/application/ports/platform-admin";
import type { Profile, Store, Subscription } from "@/domain/types/entities";
import type { EarlyBirdLedger } from "@/infrastructure/billing/early-bird-ledger";
import type { EarlyBirdGrant } from "@/domain/billing/early-bird";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";

const DAY = 24 * 60 * 60 * 1000;

function store(partial: Partial<Store> = {}): Store {
  return {
    id: "store-1",
    ownerId: "owner-1",
    name: "متجر",
    slug: "shop",
    description: null,
    logoUrl: null,
    coverUrl: null,
    status: "published",
    currency: "USD",
    phone: null,
    whatsapp: null,
    email: null,
    location: null,
    openingHours: null,
    instagram: null,
    facebook: null,
    telegram: null,
    tiktok: null,
    primaryColor: "#58A379",
    themeId: "clean",
    themeOverrides: null,
    defaultLocale: "ar",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    publishedAt: "2026-01-01T00:00:00.000Z",
    suspendedAt: null,
    ...partial,
  };
}

function subscription(partial: Partial<Subscription> = {}): Subscription {
  return {
    id: "sub-1",
    storeId: "store-1",
    planId: "trial",
    billingPeriod: "monthly",
    status: "trialing",
    trialEndsAt: "2026-01-11T00:00:00.000Z",
    currentPeriodEnd: "2026-01-11T00:00:00.000Z",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...partial,
  };
}

function harness(row: AdminStoreRow, earlyBird?: EarlyBirdLedger) {
  const grants: string[] = [];
  const repo: PlatformAdminRepository = {
    async listUsers() {
      return [];
    },
    async listStoresWithSubscriptions() {
      return [{ store: row.store, subscription: row.subscription, owner: row.owner }];
    },
    async setUserSuspended() {},
    async updateStore(_storeId, patch) {
      if (patch.status) row.store = { ...row.store, status: patch.status };
      if (patch.suspended !== undefined) {
        row.store = {
          ...row.store,
          suspendedAt: patch.suspended ? new Date().toISOString() : null,
          status: patch.suspended ? "restricted" : row.store.status,
        };
      }
      return row.store;
    },
    async updateSubscription(_id, patch) {
      row.subscription = { ...row.subscription!, ...patch, updatedAt: new Date().toISOString() };
      return row.subscription;
    },
    async createSubscription(input) {
      row.subscription = {
        ...subscription(),
        ...input,
        id: "sub-new",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return row.subscription;
    },
  };
  const auth = {
    requireAdmin: async () => ({ profile: { id: "admin" } }),
  } as unknown as AuthService;
  const service = new AdminPlatformService(
    auth,
    repo,
    {
      grantOnFirstPaidActivation: async ({ referredUserId }) => {
        grants.push(referredUserId);
        return "skipped";
      },
    },
    earlyBird,
  );
  return { row, service, grants };
}

describe("admin Sham Cash activation", () => {
  it("renews the same plan from a future end and grants the referral once", async () => {
    const future = new Date(Date.now() + 20 * DAY).toISOString();
    const { row, service, grants } = harness({
      store: store(),
      owner: null,
      subscription: subscription({
        planId: "basic",
        billingPeriod: "monthly",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: future,
      }),
    });
    await service.changeStorePlan("store-1", "basic", "monthly");
    const end = Date.parse(row.subscription!.currentPeriodEnd!);
    expect(end).toBeGreaterThan(Date.parse(future) + 29 * DAY);
    expect(end).toBeLessThan(Date.parse(future) + 31 * DAY);
    expect(grants).toEqual(["owner-1"]);
    expect(isSubscriptionUsable(row.subscription!)).toBe(true);

    grants.length = 0;
    await service.changeStorePlan("store-1", "trial", "monthly");
    expect(grants).toEqual([]);
    const trialEnd = Date.parse(row.subscription!.trialEndsAt!);
    expect(trialEnd - Date.now()).toBeGreaterThan(9 * DAY);
    expect(trialEnd - Date.now()).toBeLessThan(11 * DAY);
  });

  it("reopens an expiry lock and leaves an admin suspension closed", async () => {
    const expired = harness({
      store: store({ status: "restricted", suspendedAt: null }),
      owner: null,
      subscription: subscription({
        planId: "basic",
        status: "expired",
        currentPeriodEnd: "2020-01-01T00:00:00.000Z",
      }),
    });
    await expired.service.changeStorePlan("store-1", "basic", "yearly");
    expect(expired.row.store.status).toBe("published");
    expect(expired.row.store.suspendedAt).toBeNull();
    const yearEnd = Date.parse(expired.row.subscription!.currentPeriodEnd!);
    expect(yearEnd - Date.now()).toBeGreaterThan(360 * DAY);
    expect(yearEnd - Date.now()).toBeLessThan(370 * DAY);

    const suspendedAt = "2026-02-01T00:00:00.000Z";
    const locked = harness({
      store: store({ status: "restricted", suspendedAt }),
      owner: null,
      subscription: subscription({ planId: "basic", status: "expired" }),
    });
    await locked.service.changeStorePlan("store-1", "pro", "monthly");
    expect(locked.row.store.status).toBe("restricted");
    expect(locked.row.store.suspendedAt).toBe(suspendedAt);
  });

  it("records the early-bird first-year Sham Cash amount", async () => {
    const recorded: number[] = [];
    const grant: EarlyBirdGrant = {
      userId: "owner-1",
      storeId: "store-1",
      slotNumber: 1,
      claimedAt: "2026-01-01T00:00:00.000Z",
      appliedAt: null,
      discountUntil: null,
      planId: null,
      billingPeriod: null,
      chargedAmountUsd: null,
    };
    const ledger: EarlyBirdLedger = {
      async claim() {
        return { eligible: true, slotNumber: 1, alreadyClaimed: true };
      },
      async findByUserId() {
        return grant;
      },
      async recordActivation(input) {
        recorded.push(input.chargedAmountUsd);
        grant.discountUntil = input.discountUntil;
        grant.chargedAmountUsd = input.chargedAmountUsd;
        grant.appliedAt = input.appliedAt;
      },
    };
    const { service } = harness(
      {
        store: store(),
        owner: null,
        subscription: subscription({ planId: "trial", status: "trialing" }),
      },
      ledger,
    );
    await service.changeStorePlan("store-1", "basic", "yearly");
    expect(recorded).toEqual([30]);
    await service.changeStorePlan("store-1", "trial", "monthly");
    expect(recorded).toEqual([30]);
  });

  it("extends extra days from the current end", async () => {
    const future = new Date(Date.now() + 10 * DAY).toISOString();
    const { row, service } = harness({
      store: store(),
      owner: null as Profile | null,
      subscription: subscription({
        planId: "pro",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: future,
      }),
    });
    await service.extendSubscription("sub-1", 15);
    const end = Date.parse(row.subscription!.currentPeriodEnd!);
    expect(end).toBeGreaterThan(Date.parse(future) + 14 * DAY);
    expect(end).toBeLessThan(Date.parse(future) + 16 * DAY);
  });
});
