import { NextResponse } from "next/server";
import {
  ICONIFY_ALLOWED_PREFIXES,
  searchLucideIcons,
  translateIconQuery,
} from "@/lib/icon-search";

type IconifySearchResponse = {
  icons?: string[];
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = (searchParams.get("q") ?? "").trim();
  if (raw.length > 80) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  const lucide = searchLucideIcons(raw, 36).map((entry) => entry.id);

  let iconify: string[] = [];
  const resolvedQuery = translateIconQuery(raw || "store");
  if (raw.length >= 1) {
    try {
      const url = new URL("https://api.iconify.design/search");
      url.searchParams.set("query", resolvedQuery);
      url.searchParams.set("limit", "64");
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      });
      if (res.ok) {
        const data = (await res.json()) as IconifySearchResponse;
        iconify = (data.icons ?? []).filter((id) => {
          const prefix = id.split(":")[0]?.toLowerCase();
          return (
            Boolean(prefix) &&
            ICONIFY_ALLOWED_PREFIXES.has(prefix) &&
            /^[a-z0-9-]+:[a-z0-9-]+$/i.test(id)
          );
        });
      }
    } catch {
      // Lucide-only fallback is fine
    }
  }

  const seen = new Set<string>();
  const icons: string[] = [];
  for (const id of [...lucide, ...iconify]) {
    if (seen.has(id)) continue;
    seen.add(id);
    icons.push(id);
    if (icons.length >= 48) break;
  }

  return NextResponse.json({
    query: raw,
    resolvedQuery,
    icons,
    total: icons.length,
  });
}
