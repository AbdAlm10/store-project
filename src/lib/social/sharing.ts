import { appConfig } from "@/config/app";
import type { Product, Store } from "@/domain/types/entities";
import { discountPercent } from "@/domain/rules/store-rules";

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
    `Hello! I would like to order from ${input.store.name}:`,
    "",
    `Product: ${input.product.name}`,
    input.variantLabel ? `Variant: ${input.variantLabel}` : null,
    `Quantity: ${quantity}`,
    `Price: ${formatMoney(input.product.price, input.product.currency)}`,
    `Link: ${productUrl(input.storeSlug, input.productSlug)}`,
  ].filter(Boolean);

  const message = lines.join("\n");
  const phone = input.store.whatsapp.replace(/[^\d+]/g, "").replace(/^\+/, "");
  const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  return { url, message };
}

export function formatMoney(
  amount: number,
  currency: string,
  locale: string = "en",
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
  const price = formatMoney(product.price, product.currency);
  const discountBit = discount ? ` (${discount}% off)` : "";
  return `${product.name} — ${price}${discountBit} at ${store.name}`;
}

export function socialShareLinks(url: string, text: string) {
  return {
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
  };
}
