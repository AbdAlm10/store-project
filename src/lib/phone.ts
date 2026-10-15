import { isValidPhoneNumber } from "libphonenumber-js";

export const INTERNATIONAL_PHONE_MESSAGE =
  "أدخل رقم هاتف دوليًا صالحًا مع رمز الدولة.";

/** Blank is allowed. Any other value must be a real number with a country code. */
export function internationalPhoneError(
  value: string | null | undefined,
): string | null {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;
  if (trimmed.startsWith("+") && isValidPhoneNumber(trimmed)) return null;
  return INTERNATIONAL_PHONE_MESSAGE;
}
