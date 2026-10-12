import { NextResponse } from "next/server";
import { getServices } from "@/infrastructure/container";
import { getRateLimiter } from "@/infrastructure/rate-limit/enforce";
import { toUserMessage, AppError } from "@/domain/errors";
import {
  clientIpFromHeaders,
  formatCityLabel,
  resolveRequestGeo,
} from "@/lib/analytics/geo";

const MAX_BODY_BYTES = 20_000;

export async function POST(request: Request) {
  try {
    const ip = clientIpFromHeaders(request.headers);
    const limit = await getRateLimiter().check(
      "analytics",
      ip ?? "unknown",
    );
    if (!limit.allowed) {
      return NextResponse.json(
        { ok: false, error: "محاولات كثيرة. حاول مرة أخرى بعد قليل." },
        { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds ?? 60) } },
      );
    }

    const declared = Number(request.headers.get("content-length") ?? "0");
    if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
    }
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) {
      return NextResponse.json({ ok: false, error: "Payload too large" }, { status: 413 });
    }
    const body = JSON.parse(text) as Record<string, unknown>;
    const geo = await resolveRequestGeo(request);
    const metadata =
      body.metadata &&
      typeof body.metadata === "object" &&
      !Array.isArray(body.metadata)
        ? { ...(body.metadata as Record<string, unknown>) }
        : {};

    // Prefer server-resolved city; keep a client hint only if server has none.
    const clientCity =
      typeof metadata.city === "string" ? metadata.city.trim() : "";

    if (geo?.city) {
      metadata.city = formatCityLabel(geo);
      metadata.countryCode = geo.countryCode;
      metadata.location = formatCityLabel(geo);
    } else if (clientCity && clientCity !== "—" && clientCity !== "تطوير") {
      metadata.city = clientCity;
      metadata.location = clientCity;
    } else {
      delete metadata.location;
    }

    await getServices().analytics.track({
      ...body,
      metadata,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError && error.status < 500) {
      return NextResponse.json(
        { ok: false, error: toUserMessage(error) },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { ok: false, error: "تعذّر تسجيل الحدث." },
      { status: 400 },
    );
  }
}
