const VISITOR_KEY = "ys_vid";
const CITY_KEY = "ys_city";

function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().replace(/-/g, "").slice(0, 24);
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

/** Stable per-browser visitor id (localStorage). */
export function getVisitorKey(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing && existing.length >= 8 && existing.length <= 80) {
      return existing;
    }
    const next = randomId();
    window.localStorage.setItem(VISITOR_KEY, next);
    return next;
  } catch {
    return randomId();
  }
}

/** Real visitor city from their public IP (cached in sessionStorage). */
async function resolveVisitorCity(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const cached = window.sessionStorage.getItem(CITY_KEY);
    if (cached && cached.length >= 2 && cached.length <= 80) return cached;

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 2500);
    const res = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      cache: "no-store",
    });
    window.clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      city?: string;
    };
    const city = data.success ? data.city?.trim() : null;
    if (!city) return null;
    window.sessionStorage.setItem(CITY_KEY, city);
    return city;
  } catch {
    return null;
  }
}

export type ClientTrackInput = {
  storeId: string;
  productId?: string | null;
  eventType:
    | "store_view"
    | "product_view"
    | "whatsapp_click"
    | "share"
    | "search"
    | "qr_scan";
  source?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown>;
};

function sendTrackPayload(payload: Record<string, unknown>): void {
  const body = JSON.stringify(payload);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const ok = navigator.sendBeacon("/api/analytics/track", blob);
      if (ok) return;
    }
  } catch {
    /* fall through */
  }

  void fetch("/api/analytics/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* ignore network errors */
  });
}

/** Fire-and-forget analytics event from the storefront (includes real city). */
export function trackAnalyticsEvent(input: ClientTrackInput): void {
  if (typeof window === "undefined") return;

  void (async () => {
    const city = await resolveVisitorCity();
    sendTrackPayload({
      storeId: input.storeId,
      productId: input.productId ?? null,
      eventType: input.eventType,
      source: input.source ?? null,
      path: input.path ?? window.location.pathname,
      visitorKey: getVisitorKey(),
      metadata: {
        ...(city ? { city, location: city } : {}),
        ...(input.metadata ?? {}),
      },
    });
  })();
}
