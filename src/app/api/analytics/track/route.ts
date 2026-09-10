import { NextResponse } from "next/server";
import { getServices } from "@/infrastructure/container";
import { toUserMessage, AppError } from "@/domain/errors";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    await getServices().analytics.track(body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 400;
    return NextResponse.json(
      { ok: false, error: toUserMessage(error) },
      { status },
    );
  }
}
