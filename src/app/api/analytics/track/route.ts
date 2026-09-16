import { NextResponse } from "next/server";
import { getServices } from "@/infrastructure/container";
import { toUserMessage, AppError } from "@/domain/errors";
import { formatCityLabel, resolveRequestGeo } from "@/lib/analytics/geo";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
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
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json(
      { ok: false, error: toUserMessage(error) },
      { status },
    );
  }
}
