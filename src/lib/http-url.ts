const HEX_HOST = /^[0-9a-f:]+$/i;

function ipv4Parts(hostname: string): number[] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.some((part) => part > 255)) return null;
  return parts;
}

/** Hosts that must not be fetched or embedded as merchant-controlled resources. */
export function isBlockedHostname(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "metadata.google.internal"
  ) {
    return true;
  }
  if (host.includes(":")) {
    if (!HEX_HOST.test(host)) return true;
    if (host.startsWith("fe80") || host.startsWith("fc") || host.startsWith("fd")) {
      return true;
    }
    return false;
  }
  const parts = ipv4Parts(host);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

export function isPublicHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    if (isBlockedHostname(url.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

function isBase64Payload(value: string): boolean {
  if (!value || value.length > 8_000_000) return false;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    const ok =
      (code >= 48 && code <= 57) ||
      (code >= 65 && code <= 90) ||
      (code >= 97 && code <= 122) ||
      code === 43 ||
      code === 47 ||
      code === 61 ||
      code === 10 ||
      code === 13 ||
      code === 32;
    if (!ok) return false;
  }
  return true;
}

/** Remote http(s) image, or an in-memory demo data URL. Rejects javascript: and file:. */
export function isAllowedImageUrl(value: string): boolean {
  if (value.startsWith("data:image/")) {
    const comma = value.indexOf(",");
    if (comma < 0 || comma > 80) return false;
    const header = value.slice(0, comma).toLowerCase();
    if (!/^data:image\/(png|jpeg|jpg|webp|avif);base64$/.test(header)) return false;
    return isBase64Payload(value.slice(comma + 1));
  }
  return isPublicHttpUrl(value);
}

export function safeHttpOrigin(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.username || url.password) return null;
    return url.origin;
  } catch {
    return null;
  }
}
