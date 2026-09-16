type GeoInfo = {
  countryCode: string;
  city: string;
};

const geoCache = new Map<string, GeoInfo | null>();

function isPrivateIp(ip: string): boolean {
  if (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip === "0.0.0.0" ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  ) {
    return true;
  }
  if (ip.startsWith("172.")) {
    const second = Number(ip.split(".")[1] ?? 0);
    return second >= 16 && second <= 31;
  }
  return false;
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
    if (ip) return ip;
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
      geoCache.set(ip, null);
      return null;
    }
    const data = (await res.json()) as {
      success?: boolean;
      country_code?: string;
      city?: string;
    };
    if (!data.success || !data.city?.trim()) {
      geoCache.set(ip, null);
      return null;
    }
    const info: GeoInfo = {
      countryCode: data.country_code ?? "",
      city: data.city.trim(),
    };
    geoCache.set(ip, info);
    return info;
  } catch {
    geoCache.set(ip, null);
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
  if (ip && !isPrivateIp(ip)) {
    return lookupCityByIp(ip);
  }

  // Local/dev or missing IP: discover this machine's public egress IP, then city.
  // Useful for testing; in production visitor IP is usually in x-forwarded-for.
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
