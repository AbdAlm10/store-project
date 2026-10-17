export const SYRIAN_GOVERNORATES = [
  "دمشق",
  "ريف دمشق",
  "حلب",
  "حمص",
  "حماة",
  "اللاذقية",
  "طرطوس",
  "إدلب",
  "درعا",
  "السويداء",
  "القنيطرة",
  "دير الزور",
  "الرقة",
  "الحسكة",
] as const;

export const PAYMENT_METHODS = [
  { id: "cash", label: "كاش عند الاستلام" },
  { id: "shamcash", label: "شام كاش" },
  { id: "transfer", label: "تحويل" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"];

export function paymentLabel(id: string): string {
  return PAYMENT_METHODS.find((item) => item.id === id)?.label ?? PAYMENT_METHODS[0].label;
}

export function productNeedsOptions(product: {
  variants: Array<{ options: Record<string, string> }>;
  category?: { optionSchema: Array<{ values: unknown[] }> } | null;
}): boolean {
  if (product.variants.length > 0) return true;
  return (product.category?.optionSchema ?? []).some((option) => option.values.length > 0);
}
