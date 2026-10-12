/** httpOnly cookie set when a merchant opens /register?ref= */
export const REFERRAL_COOKIE_NAME = "ys_ref";

/** Crypto-random codes are base64url, 16–64 chars. Reject anything else. */
export const REFERRAL_CODE_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

export function generateReferralCode(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}
