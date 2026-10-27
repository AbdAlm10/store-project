import { appConfig } from "@/config/app";
import { earlyBirdPrice, formatUsd, PLANS } from "@/config/plans";
import { discountPercent } from "@/domain/rules/store-rules";
import type { Product, Store } from "@/domain/types/entities";

export function storeUrl(slug: string): string {
  return `${appConfig.url}/${slug}`;
}

export function productUrl(storeSlug: string, productSlug: string): string {
  return `${appConfig.url}/${storeSlug}/products/${productSlug}`;
}

export function categoryUrl(storeSlug: string, categorySlug: string): string {
  return `${appConfig.url}/${storeSlug}/category/${categorySlug}`;
}

export function buildWhatsAppOrderMessage(input: {
  store: Pick<Store, "name" | "whatsapp">;
  product: Pick<Product, "name" | "price" | "currency">;
  storeSlug: string;
  productSlug: string;
  quantity?: number;
  variantLabel?: string | null;
}): { url: string; message: string } | null {
  if (!input.store.whatsapp) return null;

  const quantity = input.quantity ?? 1;
  const lines = [
    `مرحبًا! أود الطلب من ${input.store.name}:`,
    "",
    `المنتج: ${input.product.name}`,
    input.variantLabel ? `الخيار: ${input.variantLabel}` : null,
    `الكمية: ${quantity}`,
    `السعر: ${formatMoney(input.product.price, input.product.currency, "ar")}`,
    `الرابط: ${productUrl(input.storeSlug, input.productSlug)}`,
  ].filter(Boolean);

  const message = lines.join("\n");
  const phone = input.store.whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return { url, message };
}

export type CartOrderLine = {
  name: string;
  options: Record<string, string>;
  quantity: number;
  lineTotal: number;
};

/** Latin digits, grouped thousands. SYP is shown as ل.س. */
export function formatOrderAmount(amount: number, currency: string): string {
  const value = Number.isFinite(amount) ? amount : 0;
  const whole = Math.abs(value - Math.round(value)) < 0.001;
  const digits = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(value);
  const suffix =
    currency === "SYP"
      ? "ل.س"
      : currency === "USD"
        ? "US$"
        : currency === "EUR"
          ? "€"
          : currency === "TRY"
            ? "₺"
            : currency;
  return `${digits} ${suffix}`;
}

export function whatsAppHref(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d]/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/** One WhatsApp message for a whole cart. Omit the order code when recording failed. */
export function buildCartWhatsAppMessage(input: {
  storeName: string;
  storeLink: string;
  orderCode: string | null;
  currency: string;
  lines: CartOrderLine[];
  total: number;
  customerName: string;
  governorate: string;
  address?: string | null;
  notes?: string | null;
  paymentLabel: string;
}): string {
  const header = input.orderCode
    ? `مرحباً ${input.storeName} 👋\nطلب جديد رقم #${input.orderCode}`
    : `مرحباً ${input.storeName} 👋\nطلب جديد`;
  const itemLines = input.lines.map((line, index) => {
    const options = Object.entries(line.options)
      .filter(([, value]) => value.trim())
      .map(([key, value]) => `${key}: ${value}`);
    const detail = [
      ...options,
      `الكمية: ${line.quantity}`,
      formatOrderAmount(line.lineTotal, input.currency),
    ].join(" · ");
    return `${index + 1}) ${line.name}\n   ${detail}`;
  });
  const address = input.address?.trim();
  const notes = input.notes?.trim();
  const tail = [
    `المجموع: ${formatOrderAmount(input.total, input.currency)}`,
    "",
    `الاسم: ${input.customerName.trim()}`,
    `المحافظة: ${input.governorate.trim()}`,
    address ? `العنوان: ${address}` : null,
    notes ? `ملاحظات: ${notes}` : null,
    `الدفع: ${input.paymentLabel}`,
    "",
    `🛒 طلب من ${input.storeName} — ${input.storeLink}`,
  ].filter((line): line is string => line !== null);
  return [header, "", ...itemLines, "", ...tail].join("\n");
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: string = "ar",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

export function productShareText(
  store: Pick<Store, "name">,
  product: Pick<Product, "name" | "price" | "currency" | "compareAtPrice">,
): string {
  const discount = discountPercent(product.price, product.compareAtPrice);
  const price = formatMoney(product.price, product.currency, "ar");
  const discountBit = discount ? ` (خصم ${discount}%)` : "";
  return `${product.name} — ${price}${discountBit} في ${store.name}`;
}

export function socialShareLinks(url: string, text: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}

export type SubscriptionIntent = "basic" | "pro";

/** WhatsApp chat with دكّان sales for Sham Cash subscribe / renew. */
export function buildSubscriptionWhatsAppUrl(input: {
  storeName: string;
  storeSlug: string;
  intent: SubscriptionIntent;
  mode?: "subscribe" | "renew";
  /** First-year 25% rate for a merchant who holds one of the first 100 slots. */
  earlyBird?: boolean;
}): string {
  const identity = `${input.storeName} (${input.storeSlug})`;
  const monthly = input.earlyBird
    ? earlyBirdPrice(input.intent, "monthly")
    : PLANS[input.intent].priceMonthlyUsd;
  const yearly = input.earlyBird
    ? earlyBirdPrice(input.intent, "yearly")
    : PLANS[input.intent].priceYearlyUsd;
  const prices = `السعر: ${formatUsd(monthly)}$ شهريًا أو ${formatUsd(yearly)}$ سنويًا.`;
  const earlyBirdNote = input.earlyBird
    ? "خصم 25% على السنة الأولى (ضمن أول 100 تاجر). بعد السنة الأولى يعود السعر الكامل."
    : null;
  const ask =
    input.intent === "pro"
      ? input.mode === "renew"
        ? "أريد تجديد خطة Pro في دكّان."
        : "أريد الاشتراك في خطة Pro في دكّان."
      : input.mode === "renew"
        ? "أريد تجديد الخطة الأساسية في دكّان."
        : "أريد الاشتراك في الخطة الأساسية في دكّان.";
  const message = [
    `أنا التاجر: ${identity}`,
    ask,
    prices,
    earlyBirdNote,
    "سأدفع عبر شام كاش على واتساب. بعد استلام المبلغ يرجى تفعيل الخطة للمدة التي أدفعها (شهر أو سنة).",
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");

  const phone = appConfig.supportWhatsApp.replace(/[^\d]/g, "");
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}
