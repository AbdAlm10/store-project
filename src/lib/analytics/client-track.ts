const VISITOR_KEY = "ys_vid";

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

export function trackAnalyticsEvent(input: ClientTrackInput): void {
  if (typeof window === "undefined") return;
  sendTrackPayload({
    storeId: input.storeId,
    productId: input.productId ?? null,
    eventType: input.eventType,
    source: input.source ?? null,
    path: input.path ?? window.location.pathname,
    visitorKey: getVisitorKey(),
    metadata: input.metadata ?? {},
  });
}
