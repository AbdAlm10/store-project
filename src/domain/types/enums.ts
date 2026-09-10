export type CurrencyCode =
  | "USD"
  | "EUR"
  | "TRY"
  | "SYP"
  | "SAR"
  | "AED"
  | "GBP";

export type StoreStatus = "draft" | "published" | "suspended" | "restricted";

export type ProductStatus = "draft" | "published" | "archived" | "hidden";

export type MembershipRole = "owner" | "manager" | "staff";

export type PlatformRole = "visitor" | "merchant" | "admin";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "expired"
  | "restricted";

export type AnalyticsEventType =
  | "store_view"
  | "product_view"
  | "whatsapp_click"
  | "share"
  | "search"
  | "qr_scan";

export type ThemeId =
  | "clean"
  | "bold"
  | "warm"
  | "minimal"
  | "classic"
  | "ocean"
  | "night"
  | "rose";
