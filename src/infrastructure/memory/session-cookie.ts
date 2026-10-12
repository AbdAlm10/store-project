import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const MEMORY_SESSION_COOKIE = "ys_memory_session";

export type MemorySessionPayload = {
  id: string;
  email: string;
};

function sessionSecret(): string {
  const fromEnv = process.env.MEMORY_SESSION_SECRET?.trim();
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  const globalState = globalThis as unknown as {
    __ysMemorySessionSecret?: string;
  };
  if (!globalState.__ysMemorySessionSecret) {
    globalState.__ysMemorySessionSecret = randomBytes(32).toString("hex");
  }
  return globalState.__ysMemorySessionSecret;
}

function sign(body: string): string {
  return createHmac("sha256", sessionSecret()).update(body).digest("base64url");
}

export function encodeSessionCookie(payload: MemorySessionPayload): string {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

export function decodeSessionCookie(raw: string): MemorySessionPayload | null {
  const dot = raw.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = raw.slice(0, dot);
  const mac = raw.slice(dot + 1);
  const expected = sign(body);
  const actualBuf = Buffer.from(mac);
  const expectedBuf = Buffer.from(expected);
  if (actualBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(actualBuf, expectedBuf)) return null;
  try {
    const data = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as MemorySessionPayload;
    if (!data || typeof data.id !== "string" || typeof data.email !== "string") {
      return null;
    }
    if (!data.id || !data.email) return null;
    if (data.id.length > 80 || data.email.length > 320) return null;
    return { id: data.id, email: data.email };
  } catch {
    return null;
  }
}
