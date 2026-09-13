import type {
  Category,
  Product,
  ProductImage,
  ProductVariant,
  ProductWithMedia,
  Profile,
  Store,
  StoreMember,
  Subscription,
} from "@/domain/types/entities";
import type { PlanId } from "@/config/plans";

type Json = Record<string, unknown>;

function num(value: unknown): number {
  return typeof value === "number" ? value : Number(value ?? 0);
}

export function mapProfile(row: Json): Profile {
  return {
    id: String(row.id),
    email: String(row.email),
    fullName: (row.full_name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    platformRole: row.platform_role as Profile["platformRole"],
    locale: String(row.locale ?? "en"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    suspendedAt: (row.suspended_at as string | null) ?? null,
  };
}

export function mapStore(row: Json): Store {
  return {
    id: String(row.id),
    ownerId: String(row.owner_id),
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    logoUrl: (row.logo_url as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    status: row.status as Store["status"],
    currency: row.currency as Store["currency"],
    phone: (row.phone as string | null) ?? null,
    whatsapp: (row.whatsapp as string | null) ?? null,
    email: (row.email as string | null) ?? null,
    location: (row.location as string | null) ?? null,
    openingHours: (row.opening_hours as string | null) ?? null,
    instagram: (row.instagram as string | null) ?? null,
    facebook: (row.facebook as string | null) ?? null,
    telegram: (row.telegram as string | null) ?? null,
    tiktok: (row.tiktok as string | null) ?? null,
    primaryColor: String(row.primary_color ?? "#58A379"),
    themeId: row.theme_id as Store["themeId"],
    themeOverrides:
      row.theme_overrides && typeof row.theme_overrides === "object"
        ? (row.theme_overrides as Store["themeOverrides"])
        : null,
    defaultLocale: (row.default_locale as Store["defaultLocale"]) ?? "en",
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: (row.published_at as string | null) ?? null,
    suspendedAt: (row.suspended_at as string | null) ?? null,
  };
}

export function storeToRow(store: Partial<Store> & { id?: string }) {
  const row: Json = {};
  if (store.id !== undefined) row.id = store.id;
  if (store.ownerId !== undefined) row.owner_id = store.ownerId;
  if (store.name !== undefined) row.name = store.name;
  if (store.slug !== undefined) row.slug = store.slug;
  if (store.description !== undefined) row.description = store.description;
  if (store.logoUrl !== undefined) row.logo_url = store.logoUrl;
  if (store.coverUrl !== undefined) row.cover_url = store.coverUrl;
  if (store.status !== undefined) row.status = store.status;
  if (store.currency !== undefined) row.currency = store.currency;
  if (store.phone !== undefined) row.phone = store.phone;
  if (store.whatsapp !== undefined) row.whatsapp = store.whatsapp;
  if (store.email !== undefined) row.email = store.email;
  if (store.location !== undefined) row.location = store.location;
  if (store.openingHours !== undefined) row.opening_hours = store.openingHours;
  if (store.instagram !== undefined) row.instagram = store.instagram;
  if (store.facebook !== undefined) row.facebook = store.facebook;
  if (store.telegram !== undefined) row.telegram = store.telegram;
  if (store.tiktok !== undefined) row.tiktok = store.tiktok;
  if (store.primaryColor !== undefined) row.primary_color = store.primaryColor;
  if (store.themeId !== undefined) row.theme_id = store.themeId;
  // undefined = leave column alone; null = reset to {}; object = save overrides
  if (store.themeOverrides !== undefined) {
    row.theme_overrides = store.themeOverrides ?? {};
  }
  if (store.defaultLocale !== undefined) row.default_locale = store.defaultLocale;
  if (store.publishedAt !== undefined) row.published_at = store.publishedAt;
  if (store.suspendedAt !== undefined) row.suspended_at = store.suspendedAt;
  return row;
}

export function mapMember(row: Json): StoreMember {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    userId: String(row.user_id),
    role: row.role as StoreMember["role"],
    createdAt: String(row.created_at),
  };
}

import { normalizeOptionSchema } from "@/lib/option-colors";

export function mapCategory(row: Json): Category {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    name: String(row.name),
    slug: String(row.slug),
    sortOrder: num(row.sort_order),
    optionSchema: normalizeOptionSchema(row.option_schema),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapProduct(row: Json): Product {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    categoryId: (row.category_id as string | null) ?? null,
    name: String(row.name),
    slug: String(row.slug),
    description: (row.description as string | null) ?? null,
    price: num(row.price),
    compareAtPrice:
      row.compare_at_price == null ? null : num(row.compare_at_price),
    currency: row.currency as Product["currency"],
    stock: row.stock == null ? null : num(row.stock),
    status: row.status as Product["status"],
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : [],
    specifications:
      row.specifications && typeof row.specifications === "object"
        ? (row.specifications as Record<string, string>)
        : {},
    featured: Boolean(row.featured),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    publishedAt: (row.published_at as string | null) ?? null,
  };
}

export function productToRow(product: Partial<Product> & { id?: string }) {
  const row: Json = {};
  if (product.id !== undefined) row.id = product.id;
  if (product.storeId !== undefined) row.store_id = product.storeId;
  if (product.categoryId !== undefined) row.category_id = product.categoryId;
  if (product.name !== undefined) row.name = product.name;
  if (product.slug !== undefined) row.slug = product.slug;
  if (product.description !== undefined) row.description = product.description;
  if (product.price !== undefined) row.price = product.price;
  if (product.compareAtPrice !== undefined) {
    row.compare_at_price = product.compareAtPrice;
  }
  if (product.currency !== undefined) row.currency = product.currency;
  if (product.stock !== undefined) row.stock = product.stock;
  if (product.status !== undefined) row.status = product.status;
  if (product.tags !== undefined) row.tags = product.tags;
  if (product.specifications !== undefined) {
    row.specifications = product.specifications;
  }
  if (product.featured !== undefined) row.featured = product.featured;
  if (product.publishedAt !== undefined) row.published_at = product.publishedAt;
  return row;
}

export function mapImage(row: Json): ProductImage {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    storeId: String(row.store_id),
    url: String(row.url),
    alt: (row.alt as string | null) ?? null,
    sortOrder: num(row.sort_order),
    width: row.width == null ? null : num(row.width),
    height: row.height == null ? null : num(row.height),
  };
}

export function mapVariant(row: Json): ProductVariant {
  return {
    id: String(row.id),
    productId: String(row.product_id),
    storeId: String(row.store_id),
    name: String(row.name),
    options:
      row.options && typeof row.options === "object"
        ? (row.options as Record<string, string>)
        : {},
    price: row.price == null ? null : num(row.price),
    stock: row.stock == null ? null : num(row.stock),
    sku: (row.sku as string | null) ?? null,
  };
}

export function mapSubscription(row: Json): Subscription {
  return {
    id: String(row.id),
    storeId: String(row.store_id),
    planId: row.plan_id as PlanId,
    status: row.status as Subscription["status"],
    trialEndsAt: (row.trial_ends_at as string | null) ?? null,
    currentPeriodEnd: (row.current_period_end as string | null) ?? null,
    stripeCustomerId: (row.stripe_customer_id as string | null) ?? null,
    stripeSubscriptionId: (row.stripe_subscription_id as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function withMedia(
  product: Product,
  images: ProductImage[],
  variants: ProductVariant[],
  category?: Category | null,
): ProductWithMedia {
  return {
    ...product,
    images: [...images].sort((a, b) => a.sortOrder - b.sortOrder),
    variants,
    category: category ?? null,
  };
}
