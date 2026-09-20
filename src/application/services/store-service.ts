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
  slugify,
} from "@/domain/rules/store-rules";
import type { Store } from "@/domain/types/entities";
import type {
  StoreMemberRepository,
  StoreRepository,
  SubscriptionRepository,
} from "@/application/ports/repositories";
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
    const slug = data.slug;

    if (!slug) {
      throw new AppError(
        "VALIDATION",
        "Store URL: use only lowercase letters, numbers, and hyphens (e.g. alnoor).",
      );
    }

    if (await this.stores.slugExists(slug)) {
      throw new AppError("CONFLICT", "This store URL is already taken.");
    }

    const store = await this.stores.create({
      id: crypto.randomUUID(),
      ownerId: session.user.id,
      name: data.name,
      slug,
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

    await this.members.create({
      storeId: store.id,
      userId: session.user.id,
      role: "owner",
    });

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + TRIAL_DAYS);

    await this.subscriptions.create({
      storeId: store.id,
      planId: "trial",
      status: "trialing",
      trialEndsAt: trialEndsAt.toISOString(),
      currentPeriodEnd: trialEndsAt.toISOString(),
      stripeCustomerId: null,
      stripeSubscriptionId: null,
    });

    return store;
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
    return this.stores.listByUserId(session.user.id);
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
      patch.publishedAt = new Date().toISOString();
    }

    return this.stores.update(storeId, patch);
  }

  async getPublicStoreBySlug(slug: string): Promise<Store> {
    const store = await this.stores.findBySlug(slug);
    if (!store || store.status !== "published") {
      throw new AppError("NOT_FOUND", "Store not found.");
    }
    return store;
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

  private async sanitizeThemeOverrides(
    storeId: string,
    overrides: ThemeOverrides | null,
  ): Promise<ThemeOverrides | null> {
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
