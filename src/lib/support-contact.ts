/** Public support chat. Empty when NEXT_PUBLIC_SUPPORT_WHATSAPP is unset. */
export function publicSupportWhatsAppUrl(): string | null {
  const digits = (process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "").replace(
    /[^\d]/g,
    "",
  );
  if (!digits) return null;
  return `https://wa.me/${digits}`;
}
