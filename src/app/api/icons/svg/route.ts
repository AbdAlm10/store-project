import { NextResponse } from "next/server";
import { ICONIFY_ALLOWED_PREFIXES } from "@/lib/icon-search";

export async function GET(request: Request) {
  const id = (new URL(request.url).searchParams.get("id") ?? "").trim();
  if (!/^[a-z0-9-]+:[a-z0-9-]+$/i.test(id)) {
    return NextResponse.json({ error: "Invalid icon id" }, { status: 400 });
  }

  const [prefix, name] = id.split(":");
  if (!ICONIFY_ALLOWED_PREFIXES.has(prefix.toLowerCase())) {
    return NextResponse.json({ error: "Icon set not allowed" }, { status: 400 });
  }

  try {
    const upstream = await fetch(
      `https://api.iconify.design/${encodeURIComponent(prefix)}/${encodeURIComponent(name)}.svg`,
      { next: { revalidate: 86_400 } },
    );
    if (!upstream.ok) {
      return NextResponse.json({ error: "Icon not found" }, { status: 404 });
    }
    const svg = await upstream.text();
    if (!svg.includes("<svg")) {
      return NextResponse.json({ error: "Invalid SVG" }, { status: 502 });
    }
    return new NextResponse(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return NextResponse.json({ error: "Icon fetch failed" }, { status: 502 });
  }
}
