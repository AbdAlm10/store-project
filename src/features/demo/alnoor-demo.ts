import type { AnalyticsEvent, Category, Product, ProductImage, Profile, Store, Subscription } from "@/domain/types/entities";
import catalogJson from "./alnoor-demo.json";

/**
 * Static copy of the public النور store (https://dukkaan.netlify.app/alnoor),
 * read once and hardcoded. Option group names and values are Arabic.
 * Two products point at a category the public list omitted; it is named أطفال
 * from the store description and the product tags. No runtime database read.
 */
const STORE_ID = catalogJson.storeId;
const OWNER_ID = catalogJson.ownerId;
const NOW = "2026-10-12T20:15:12.559Z";

export const alnoorCategories = catalogJson.categories as Category[];
export const alnoorProducts = catalogJson.products as Product[];
export const alnoorImages = catalogJson.images as ProductImage[];

export const alnoorOrders = catalogJson.orders;

export const alnoorStore = {
  id: STORE_ID,
  ownerId: OWNER_ID,
  name: "النور",
  slug: "alnoor",
  description:
    "متجر ألبسة وأزياء في دمشق: أزياء رجالية ونسائية وأطفال وإكسسوارات بتصاميم عصرية وأسعار مناسبة. اطلب عبر واتساب.",
  logoUrl: null,
  coverUrl: null,
  status: "published",
  currency: "SYP",
  phone: null,
  whatsapp: null,
  email: null,
  location: "دمشق",
  openingHours:
    '{"version":1,"days":[{"day":"mon","closed":false,"open":"09:00","close":"18:00"},{"day":"tue","closed":false,"open":"09:00","close":"18:00"},{"day":"wed","closed":false,"open":"09:00","close":"18:00"},{"day":"thu","closed":false,"open":"09:00","close":"18:00"},{"day":"fri","closed":false,"open":"09:00","close":"18:00"},{"day":"sat","closed":false,"open":"09:00","close":"18:00"},{"day":"sun","closed":true,"open":"09:00","close":"18:00"}]}',
  instagram: null,
  facebook: null,
  telegram: null,
  tiktok: null,
  primaryColor: "#58A379",
  themeId: "clean",
  themeOverrides: { navbarActions: "none" },
  defaultLocale: "ar",
  createdAt: "2026-10-12T20:03:39.659Z",
  updatedAt: "2026-10-13T14:12:08.162Z",
  publishedAt: NOW,
  suspendedAt: null,
} satisfies Store;

export const alnoorProfile = {
  id: OWNER_ID,
  email: "noor@demo.local",
  fullName: "صاحب متجر النور",
  avatarUrl: null,
  platformRole: "merchant",
  locale: "ar",
  createdAt: NOW,
  updatedAt: NOW,
  suspendedAt: null,
} satisfies Profile;

export const alnoorSubscription = {
  id: "00000000-0000-4000-8000-0000000000aa",
  storeId: STORE_ID,
  planId: "pro",
  billingPeriod: "yearly",
  status: "active",
  trialEndsAt: null,
  currentPeriodEnd: "2027-10-12T20:15:12.559Z",
  stripeCustomerId: null,
  stripeSubscriptionId: null,
  createdAt: NOW,
  updatedAt: NOW,
} satisfies Subscription;

/** Visit rows for the demo analytics cards. Counted locally from these products. */
export const alnoorEvents: AnalyticsEvent[] = Array.from({ length: 40 }, (_, index) => {
  const product = alnoorProducts[index % alnoorProducts.length];
  const eventType =
    index % 5 === 0 ? "whatsapp_click" : index % 3 === 0 ? "store_view" : "product_view";
  return {
    id: `alnoor-event-${index}`,
    storeId: STORE_ID,
    productId: eventType === "store_view" ? null : (product?.id ?? null),
    eventType,
    source: index % 2 === 0 ? "واتساب" : "إنستغرام",
    path: "/alnoor",
    visitorKey: `زائر-${index % 12}`,
    metadata: {},
    createdAt: new Date(Date.now() - index * 3_600_000).toISOString(),
  };
});
