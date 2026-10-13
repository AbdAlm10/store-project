type GeoInfo = {
  countryCode: string;
  city: string;
};

const GEO_CACHE_MAX = 500;
const geoCache = new Map<string, GeoInfo | null>();

function rememberGeo(ip: string, info: GeoInfo | null): void {
  if (geoCache.size >= GEO_CACHE_MAX) {
    const oldest = geoCache.keys().next().value;
    if (oldest) geoCache.delete(oldest);
  }
  geoCache.set(ip, info);
}

function isPublicLookupIp(ip: string): boolean {
  if (ip.includes(":")) {
    if (!/^[0-9a-f:]+$/i.test(ip) || ip.length > 64) return false;
    const lower = ip.toLowerCase();
    if (
      lower === "::1" ||
      lower.startsWith("fe80") ||
      lower.startsWith("fc") ||
      lower.startsWith("fd")
    ) {
      return false;
    }
    return true;
  }
  if (!/^(?:\d{1,3}\.){3}\d{1,3}$/.test(ip)) return false;
  const parts = ip.split(".").map(Number);
  if (parts.some((part) => part > 255)) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return false;
  if (a === 169 && b === 254) return false;
  if (a === 192 && b === 168) return false;
  if (a === 172 && b >= 16 && b <= 31) return false;
  if (a === 100 && b >= 64 && b <= 127) return false;
  return true;
}

export function clientIpFromHeaders(headers: Headers): string | null {
  const candidates = [
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
    headers.get("x-real-ip")?.trim(),
    headers.get("cf-connecting-ip")?.trim(),
    headers.get("x-client-ip")?.trim(),
    headers.get("true-client-ip")?.trim(),
  ];
  for (const raw of candidates) {
    if (!raw) continue;
    const ip = raw.replace(/^::ffff:/, "").trim();
    if (ip && ip.length <= 64) return ip;
  }
  return null;
}

async function lookupCityByIp(ip: string): Promise<GeoInfo | null> {
  if (geoCache.has(ip)) return geoCache.get(ip) ?? null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`, {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) {
      rememberGeo(ip, null);
      return null;
    }
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      city?: string;
    };
    if (!data.success || !data.city?.trim()) {
      rememberGeo(ip, null);
      return null;
    }
    const info: GeoInfo = {
      countryCode: data.country_code ?? "",
      city: data.city.trim(),
    };
    rememberGeo(ip, info);
    return info;
  } catch {
    rememberGeo(ip, null);
    return null;
  }
}

/**
 * Resolve visitor city from edge headers or public IP lookup.
 * Never returns fake/local placeholder labels.
 */
export async function resolveRequestGeo(
  request: Request,
): Promise<GeoInfo | null> {
  const headers = request.headers;

  const vercelCity = headers.get("x-vercel-ip-city");
  const vercelCountry = headers.get("x-vercel-ip-country");
  if (vercelCity && vercelCity !== "null") {
    try {
      return {
        countryCode: vercelCountry ?? "",
        city: decodeURIComponent(vercelCity),
      };
    } catch {
      return { countryCode: vercelCountry ?? "", city: vercelCity };
    }
  }

  const cfCity = headers.get("cf-ipcity");
  if (cfCity?.trim()) {
    return {
      countryCode: headers.get("cf-ipcountry") ?? "",
      city: cfCity.trim(),
    };
  }

  const ip = clientIpFromHeaders(headers);
  if (ip && isPublicLookupIp(ip)) {
    return lookupCityByIp(ip);
  }

  // Local/dev only: discover this machine's public egress IP, then city.
  // In production a missing visitor IP must not be labeled with the server's city.
  if (process.env.NODE_ENV === "production") return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://ipwho.is/", {
      signal: controller.signal,
      cache: "no-store",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      city?: string;
      ip?: string;
    };
    if (!data.success || !data.city?.trim()) return null;
    return {
      countryCode: data.country_code ?? "",
      city: data.city.trim(),
    };
  } catch {
    return null;
  }
}

/** City-only label for analytics aggregation. */
export function formatCityLabel(geo: GeoInfo): string {
  return geo.city.trim();
}
