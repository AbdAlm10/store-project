import { headers } from "next/headers";

export const DEMO_WRITE_ERROR = "demo_readonly" as const;

export type DemoWriteBlock = { ok: false; error: typeof DEMO_WRITE_ERROR };

/** Repository methods that persist merchant or platform data. */
export const DATA_LAYER_WRITE_METHODS = [
  "create",
  "update",
  "updateOptions",
  "updateStore",
  "updateProfile",
  "updatePassword",
  "delete",
  "duplicate",
  "publish",
  "upload",
  "deleteOwnedPublicUrl",
  "deleteClearedAssetUrl",
  "logout",
  "track",
  "register",
] as const;

const WRITE_METHOD_SET = new Set<string>(DATA_LAYER_WRITE_METHODS);

export function isDataLayerWriteMethod(name: string): boolean {
  return WRITE_METHOD_SET.has(name);
}

export function isDemoPath(pathname: string): boolean {
  const path = pathname.split("?")[0] ?? pathname;
  return path === "/demo" || path.startsWith("/demo/");
}

export function pathFromHeader(value: string | null): string | null {
  if (!value) return null;
  if (value.startsWith("/")) return value.split("?")[0] ?? value;
  try {
    return new URL(value).pathname;
  } catch {
    return null;
  }
}

export function requestLooksLikeDemo(headerValues: Array<string | null>): boolean {
  return headerValues.some((value) => {
    const path = pathFromHeader(value);
    return path ? isDemoPath(path) : false;
  });
}

export async function refuseDemoWrite(): Promise<DemoWriteBlock | null> {
  try {
    const headerList = await headers();
    const blocked = requestLooksLikeDemo([
      headerList.get("next-url"),
      headerList.get("x-pathname"),
      headerList.get("x-invoke-path"),
      headerList.get("referer"),
    ]);
    if (blocked) return { ok: false, error: DEMO_WRITE_ERROR };
  } catch {
    // Called outside a request (tests of the real dashboard). Not demo.
  }
  return null;
}

/**
 * Single chokepoint for mutations. Demo requests return before `write` runs,
 * so repository and Supabase write methods are never invoked.
 */
export async function executeWrite<T>(
  write: () => Promise<T>,
): Promise<T | DemoWriteBlock> {
  const blocked = await refuseDemoWrite();
  if (blocked) return blocked;
  return write();
}
