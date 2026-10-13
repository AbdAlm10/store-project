export function normalizeEmail(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const value = raw.trim().toLowerCase();
  return value.length > 0 ? value : null;
}

/**
 * Digits only. `00` international prefix is stripped. A local `0` prefix
 * (Syria) becomes country code 963. `00963…` therefore matches `09…`.
 */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.startsWith("00")) {
    digits = digits.slice(2);
    if (!digits) return null;
    if (digits.startsWith("0")) digits = `963${digits.slice(1)}`;
  } else if (digits.startsWith("0")) {
    digits = `963${digits.slice(1)}`;
  }
  if (!digits || digits === "963") return null;
  return digits;
}

export type ContactIdentity = {
  emails: string[];
  phones: string[];
};

export function contactIdentity(
  emails: Array<string | null | undefined>,
  phones: Array<string | null | undefined>,
): ContactIdentity {
  return {
    emails: unique(emails.map(normalizeEmail)),
    phones: unique(phones.map(normalizePhone)),
  };
}

function unique(values: Array<string | null>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

export function sharedContact(
  left: ContactIdentity,
  right: ContactIdentity,
): "duplicate_email" | "duplicate_phone" | null {
  if (left.emails.some((email) => right.emails.includes(email))) {
    return "duplicate_email";
  }
  if (left.phones.some((phone) => right.phones.includes(phone))) {
    return "duplicate_phone";
  }
  return null;
}
