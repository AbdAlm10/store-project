/** Host prefix shown beside the store slug, from NEXT_PUBLIC_APP_URL. */
export function publicStorePathPrefix(appUrl: string): string {
  const trimmed = appUrl.trim().replace(/\/$/, "");
  if (!trimmed) return "localhost:3000/";
  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    return `${url.host}/`;
  } catch {
    return `${trimmed}/`;
  }
}
