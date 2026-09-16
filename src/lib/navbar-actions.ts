import type { MessageKey } from "@/i18n/messages";
import type { Store } from "@/domain/types/entities";

export const NAVBAR_ACTION_IDS = [
  "whatsapp",
  "phone",
  "instagram",
  "facebook",
  "telegram",
  "location",
] as const;

export type NavbarActionId = (typeof NAVBAR_ACTION_IDS)[number];

export const NAVBAR_ACTION_LABEL_KEY: Record<NavbarActionId, MessageKey> = {
  whatsapp: "whatsapp",
  phone: "phone",
  instagram: "instagram",
  facebook: "facebook",
  telegram: "telegram",
  location: "location",
};

export function isNavbarActionId(value: string): value is NavbarActionId {
  return (NAVBAR_ACTION_IDS as readonly string[]).includes(value);
}

export function parseNavbarActions(
  raw: string | null | undefined,
): NavbarActionId[] {
  if (!raw?.trim() || raw.trim() === "none") return [];
  const seen = new Set<NavbarActionId>();
  const result: NavbarActionId[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!isNavbarActionId(id) || seen.has(id)) continue;
    seen.add(id);
    result.push(id);
  }
  return result;
}

export function serializeNavbarActions(ids: NavbarActionId[]): string {
  const seen = new Set<NavbarActionId>();
  const ordered: NavbarActionId[] = [];
  for (const id of NAVBAR_ACTION_IDS) {
    if (!ids.includes(id) || seen.has(id)) continue;
    seen.add(id);
    ordered.push(id);
  }
  return ordered.length > 0 ? ordered.join(",") : "none";
}

/** Value stored on the store for a given action (may be empty). */
export function storeValueForNavbarAction(
  store: Pick<
    Store,
    | "whatsapp"
    | "phone"
    | "instagram"
    | "facebook"
    | "telegram"
    | "location"
  >,
  id: NavbarActionId,
): string | null {
  const value = store[id];
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

/**
 * Actions chosen for the navbar that also have a usable value.
 * Default (nothing saved yet): WhatsApp only, matching the old hard-coded button.
 */
export function resolveNavbarActions(
  store: Pick<
    Store,
    | "whatsapp"
    | "phone"
    | "instagram"
    | "facebook"
    | "telegram"
    | "location"
    | "themeOverrides"
  >,
): NavbarActionId[] {
  const raw = store.themeOverrides?.navbarActions;
  const saved =
    typeof raw === "string" ? parseNavbarActions(raw) : ([] as NavbarActionId[]);

  if (typeof raw !== "string") {
    return storeValueForNavbarAction(store, "whatsapp") ? ["whatsapp"] : [];
  }

  return saved.filter((id) => Boolean(storeValueForNavbarAction(store, id)));
}

function ensureHttpUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://${value.replace(/^\/+/, "")}`;
}

export function hrefForNavbarAction(
  store: Pick<
    Store,
    | "whatsapp"
    | "phone"
    | "instagram"
    | "facebook"
    | "telegram"
    | "location"
  >,
  id: NavbarActionId,
): string | null {
  const value = storeValueForNavbarAction(store, id);
  if (!value) return null;

  switch (id) {
    case "whatsapp": {
      const phone = value.replace(/[^\d]/g, "");
      return phone ? `https://wa.me/${phone}` : null;
    }
    case "phone": {
      const phone = value.replace(/[^\d+]/g, "");
      return phone ? `tel:${phone}` : null;
    }
    case "instagram":
    case "facebook":
    case "telegram":
      return ensureHttpUrl(value);
    case "location": {
      if (/^https?:\/\//i.test(value) || value.startsWith("//")) {
        return ensureHttpUrl(value);
      }
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`;
    }
    default:
      return null;
  }
}
