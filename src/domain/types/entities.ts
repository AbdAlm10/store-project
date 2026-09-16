import type {
  CurrencyCode,
  MembershipRole,
  PlatformRole,
  ProductStatus,
  StoreStatus,
  SubscriptionStatus,
  ThemeId,
} from "./enums";
import type { PlanId } from "@/config/plans";

export type UserId = string;
export type StoreId = string;
export type ProductId = string;
export type CategoryId = string;

export type Profile = {
  id: UserId;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  platformRole: PlatformRole;
  locale: string;
  createdAt: string;
  updatedAt: string;
  suspendedAt: string | null;
};

export type Store = {
  id: StoreId;
  ownerId: UserId;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  coverUrl: string | null;
  status: StoreStatus;
  currency: CurrencyCode;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  location: string | null;
  openingHours: string | null;
  instagram: string | null;
  facebook: string | null;
  telegram: string | null;
  tiktok: string | null;
  primaryColor: string;
  themeId: ThemeId;
  /** Theme colors plus optional navbarActions preference. */
  themeOverrides: import("@/config/themes").ThemeOverrides | null;
  defaultLocale: "ar";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  suspendedAt: string | null;
};

export type StoreMember = {
  id: string;
  storeId: StoreId;
  userId: UserId;
  role: MembershipRole;
  createdAt: string;
};

export type Category = {
  id: CategoryId;
  storeId: StoreId;
  name: string;
  slug: string;
  sortOrder: number;
  /** Optional cover/thumbnail for storefront genre circles. */
  imageUrl: string | null;
  /** Iconify icon id, e.g. `mdi:tshirt-crew`. */
  icon: string | null;
  /** Attribute templates for products in this genre (Color, Size, …). */
  optionSchema: CategoryOptionDef[];
  createdAt: string;
  updatedAt: string;
};

export type CategoryOptionValue = {
  label: string;
  /** Hex (#RRGGBB) when this value is a color swatch. */
  hex?: string | null;
};

export type CategoryOptionDef = {
  id: string;
  name: string;
  /** color → swatches; text → chips */
  kind: "color" | "text";
  values: CategoryOptionValue[];
};

export type ProductImage = {
  id: string;
  productId: ProductId;
  storeId: StoreId;
  url: string;
  alt: string | null;
  sortOrder: number;
  width: number | null;
  height: number | null;
};

export type ProductVariant = {
  id: string;
  productId: ProductId;
  storeId: StoreId;
  name: string;
  options: Record<string, string>;
  price: number | null;
  stock: number | null;
  sku: string | null;
};

export type Product = {
  id: ProductId;
  storeId: StoreId;
  categoryId: CategoryId | null;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  compareAtPrice: number | null;
  currency: CurrencyCode;
  stock: number | null;
  status: ProductStatus;
  tags: string[];
  specifications: Record<string, string>;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

export type ProductWithMedia = Product & {
  images: ProductImage[];
  variants: ProductVariant[];
  category?: Category | null;
};

export type Subscription = {
  id: string;
  storeId: StoreId;
  planId: PlanId;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AnalyticsEvent = {
  id: string;
  storeId: StoreId;
  productId: ProductId | null;
  eventType: import("./enums").AnalyticsEventType;
  source: string | null;
  path: string | null;
  visitorKey: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};
