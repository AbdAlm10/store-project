import {
  BASIC_THEME_COLOR_KEYS,
  TRIAL_DAYS,
} from "@/config/plans";
import type { ThemeColorKey, ThemeOverrides } from "@/config/themes";
import { THEME_TOKEN_KEYS } from "@/config/themes";
import { AppError } from "@/domain/errors";
import {
  assertCanManageStore,
  assertStoreActive,
  isSubscriptionUsable,
  publishNeedsWhatsapp,
  slugify,
} from "@/domain/rules/store-rules";
import type { Store } from "@/domain/types/entities";
import type {
  StoreMemberRepository,
  StoreRepository,
  SubscriptionRepository,
} from "@/application/ports/repositories";
import { occupiesFreeSlot } from "@/domain/plans/access";
import { assertEmailConfirmed } from "@/lib/email-verification";
import { isReadyStore } from "@/lib/onboarding-store";
import { isHiddenFromCustomers } from "@/lib/store-storefront-access";
import { parseNavbarActions } from "@/lib/navbar-actions";
import { createStoreSchema, updateStoreSchema } from "@/validations/schemas";
import type { AuthService } from "./auth-service";
import type { EntitlementService } from "./entitlement-service";

function emptyToUndefined(value: unknown): string | undefined {
  if (value == null) return undefined;
  const text = String(value).trim();
  return text.length > 0 ? text : undefined;
}

const BASIC_THEME_SET = new Set<string>(BASIC_THEME_COLOR_KEYS);

export class StoreService {
  constructor(
    private readonly auth: AuthService,
    private readonly stores: StoreRepository,
    private readonly members: StoreMemberRepository,
    private readonly subscriptions: SubscriptionRepository,
    private readonly entitlements: EntitlementService,
  ) {}

  async createStore(input: unknown): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    assertEmailConfirmed(session.user);
    const data = this.parseNewStore(input);
    const owned = await this.stores.listByUserId(session.user.id);
    const placeholder = owned.find(
      (store) => store.ownerId === session.user.id && !isReadyStore(store),
    );
    for (const existing of owned) {
      if (!isReadyStore(existing) || existing.id === placeholder?.id) continue;
      const current = await this.subscriptions.findByStoreId(existing.id).catch(() => null);
      if (occupiesFreeSlot(current)) {
        throw new AppError(
          "CONFLICT",
          "يمكن إنشاء متجر مجاني واحد لكل بريد مؤكَّد.",
        );
      }
    }

    if (await this.stores.slugExists(data.slug, placeholder?.id)) {
      throw new AppError("CONFLICT", "رابط المتجر مستخدم. اختر رابطًا آخر.");
    }

    const store = placeholder
      ? await this.stores.update(placeholder.id, {
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          currency: data.currency,
          whatsapp: data.whatsapp ?? null,
          defaultLocale: "ar",
        })
      : await this.stores.create({
          id: crypto.randomUUID(),
          ownerId: session.user.id,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          logoUrl: null,
          coverUrl: null,
          status: "draft",
          currency: data.currency,
          phone: null,
          whatsapp: data.whatsapp ?? null,
          email: null,
          location: null,
          openingHours: null,
          instagram: null,
          facebook: null,
          telegram: null,
          tiktok: null,
          primaryColor: "#58A379",
          themeId: "clean",
          // Omit until DB has theme_overrides (migration 00007). Default lives in SQL.
          themeOverrides: null,
          defaultLocale: "ar",
          publishedAt: null,
          suspendedAt: null,
        });

    await this.ensureOwnerRecords(store.id, session.user.id);
    return store;
  }

  /** Validates the full onboarding payload before any store row is written. */
  private parseNewStore(input: unknown) {
    const raw =
      input && typeof input === "object"
        ? (input as Record<string, unknown>)
        : {};
    const name = String(raw.name ?? "").trim();
    const requestedSlug = String(raw.slug ?? "").trim();
    const normalizedSlug = slugify(requestedSlug) || slugify(name);
    const data = createStoreSchema.parse({
      ...raw,
      name,
      slug: normalizedSlug,
      description: emptyToUndefined(raw.description),
      whatsapp: emptyToUndefined(raw.whatsapp),
    });
    if (!data.slug) {
      throw new AppError(
        "VALIDATION",
        "Store URL: use only lowercase letters, numbers, and hyphens (e.g. alnoor).",
      );
    }
    return data;
  }

  private async ensureOwnerRecords(storeId: string, userId: string) {
    const membership = await this.members.findMembership(storeId, userId);
    if (!membership) {
      await this.members.create({
        storeId,
        userId,
        role: "owner",
      });
    }
    const existing = await this.subscriptions.findByStoreId(storeId).catch(() => null);
    if (existing) return;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);
    await this.subscriptions.create({
      storeId,
      planId: "trial",
      billingPeriod: "monthly",
      status: "trialing",
      trialEndsAt: trialEndsAt.toISOString(),
      currentPeriodEnd: trialEndsAt.toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    });
  }

  async getStoreForOwner(storeId: string): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "staff");
    return store;
  }

  async listMyStores(): Promise<Store[]> {
    const { session } = await this.auth.requireProfile();
    const stores = await this.stores.listByUserId(session.user.id);
    return stores.filter(isReadyStore);
  }

  async updateStore(storeId: string, input: unknown): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "manager");
    assertStoreActive(store);

    const data = updateStoreSchema.parse(input);
    const patch: Partial<Store> = { ...data };

    if (data.themeOverrides !== undefined) {
      patch.themeOverrides = await this.sanitizeThemeOverrides(
        storeId,
        data.themeOverrides,
      );
    }

    if (data.status === "published" && store.status !== "published") {
      if (
        publishNeedsWhatsapp({
          currentStatus: store.status,
          currentWhatsapp: store.whatsapp,
          nextStatus: data.status,
          nextWhatsapp: data.whatsapp,
        })
      ) {
        throw new AppError(
          "VALIDATION",
          "أضف رقم واتساب قبل نشر المتجر.",
        );
      }
      patch.publishedAt = new Date().toISOString();
    }

    return this.stores.update(storeId, patch);
  }

  async getPublicStoreBySlug(slug: string): Promise<Store> {
    const store = await this.stores.findBySlug(slug);
    if (!store || store.status !== "published") {
      throw new AppError("NOT_FOUND", "Store not found.");
    }
    const subscription = await this.subscriptions
      .findByStoreId(store.id)
      .catch(() => null);
    if (isHiddenFromCustomers(store, subscription)) {
      throw new AppError("NOT_FOUND", "Store not found.");
    }
    return store;
  }

  /**
   * Persist an expiry freeze. Products stay. Admin activation republishes
   * when suspendedAt is null. An explicit admin suspension is left alone.
   */
  async ensureFrozenIfExpired(storeId: string): Promise<boolean> {
    const store = await this.stores.findById(storeId);
    if (!store || store.suspendedAt || store.status !== "published") return false;
    const subscription = await this.subscriptions
      .findByStoreId(storeId)
      .catch(() => null);
    if (!subscription || isSubscriptionUsable(subscription)) return false;
    await this.stores.update(storeId, { status: "restricted" });
    return true;
  }

  async restrictForExpiredSubscription(storeId: string): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "owner");
    return this.stores.update(storeId, { status: "restricted" });
  }

  async restoreAfterSubscriptionTest(storeId: string): Promise<Store> {
    const { session } = await this.auth.requireProfile();
    const store = await this.stores.findById(storeId);
    if (!store) throw new AppError("NOT_FOUND", "Store not found.");
    const membership = await this.members.findMembership(storeId, session.user.id);
    assertCanManageStore(membership, "owner");
    return this.stores.update(storeId, { status: "published" });
  }

  /**
   * Public visitors only see published stores.
   * Store members can preview draft stores (and restricted, except suspended).
   */
  async getStorefrontBySlug(slug: string): Promise<Store> {
    const store = await this.stores.findBySlug(slug);
    if (!store || store.status === "suspended") {
      throw new AppError("NOT_FOUND", "Store not found.");
    }

    const subscription = await this.subscriptions
      .findByStoreId(store.id)
      .catch(() => null);

    const { resolveStorefrontAccess } = await import(
      "@/lib/store-storefront-access"
    );

    if (isHiddenFromCustomers(store, subscription)) {
      if (await this.viewerIsMember(store.id)) {
        return resolveStorefrontAccess(store, subscription);
      }
      throw new AppError("NOT_FOUND", "Store not found.");
    }

    if (store.status === "published") {
      return store;
    }

    try {
      const { session } = await this.auth.requireProfile();
      const membership = await this.members.findMembership(
        store.id,
        session.user.id,
      );
      if (membership) return store;
    } catch {
      // anonymous / unauthenticated visitors cannot preview drafts
    }

    throw new AppError("NOT_FOUND", "Store not found.");
  }

  private async viewerIsMember(storeId: string): Promise<boolean> {
    try {
      const { session } = await this.auth.requireProfile();
      const membership = await this.members.findMembership(storeId, session.user.id);
      return Boolean(membership);
    } catch {
      return false;
    }
  }

  private async sanitizeThemeOverrides(
    storeId: string,
    overrides: ThemeOverrides | null,
  ): Promise<ThemeOverrides | null> {
    if ((await this.entitlements.themeAccess(storeId)) === "none") {
      throw new AppError("LIMIT_REACHED", "الثيمات غير متاحة في الخطة المجانية.");
    }
    if (!overrides) return null;

    const navRaw = overrides.navbarActions;
    if (typeof navRaw === "string") {
      const actions = parseNavbarActions(navRaw);
      await this.entitlements.assertNavActionsAllowed(storeId, actions.length);
    }

    const full = await this.entitlements.canCustomizeAllThemeColors(storeId);
    if (full) return overrides;

    const cleaned: ThemeOverrides = {};
    if (typeof overrides.navbarActions === "string") {
      cleaned.navbarActions = overrides.navbarActions;
    }
    for (const key of THEME_TOKEN_KEYS) {
      const value = overrides[key as ThemeColorKey];
      if (typeof value !== "string") continue;
      if (BASIC_THEME_SET.has(key)) {
        cleaned[key] = value;
      }
    }
    if (typeof overrides.logoSize === "string") {
      cleaned.logoSize = overrides.logoSize;
    }
    if (typeof overrides.radius === "string") cleaned.radius = overrides.radius;
    if (typeof overrides.fontDisplay === "string") {
      cleaned.fontDisplay = overrides.fontDisplay;
    }
    if (typeof overrides.fontBody === "string") {
      cleaned.fontBody = overrides.fontBody;
    }
    if (typeof overrides.qrStandColor === "string") {
      cleaned.qrStandColor = overrides.qrStandColor;
    }
    if (typeof overrides.qrLogoBg === "string") {
      cleaned.qrLogoBg = overrides.qrLogoBg;
    }

    return Object.keys(cleaned).length ? cleaned : null;
  }
}
