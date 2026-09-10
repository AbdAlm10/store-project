import { NextResponse } from "next/server";
import { getServices } from "@/infrastructure/container";
import { AppError, toUserMessage } from "@/domain/errors";

type Params = { params: Promise<{ slug: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { slug } = await params;
    const store = await getServices().stores.getPublicStoreBySlug(slug);
    return NextResponse.json({ store });
  } catch (error) {
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json(
      { error: toUserMessage(error) },
      { status },
    );
  }
}
