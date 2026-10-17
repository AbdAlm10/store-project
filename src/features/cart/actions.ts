"use server";

import { unstable_rethrow } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabasePublicClient } from "@/infrastructure/supabase/public-client";
import { requestClientIp } from "@/infrastructure/rate-limit/enforce";
import { PAYMENT_METHODS, SYRIAN_GOVERNORATES } from "@/lib/orders/checkout";

const itemSchema = z.object({
  productId: z.string().uuid(),
  name: z.string().trim().max(160).optional(),
  quantity: z.number().int().min(1).max(99),
  options: z.record(z.string().max(40), z.string().max(80)).optional(),
  clientUnitPrice: z.number().finite().nonnegative().optional(),
});

const inputSchema = z.object({
  storeId: z.string().uuid(),
  visitorKey: z.string().trim().max(80).optional(),
  items: z.array(itemSchema).min(1).max(30),
  customer: z.object({
    name: z.string().trim().min(2).max(80),
    governorate: z.enum(SYRIAN_GOVERNORATES),
    address: z.string().trim().max(200).optional(),
    notes: z.string().trim().max(400).optional(),
    payment: z.enum(PAYMENT_METHODS.map((item) => item.id) as ["cash", "shamcash", "transfer"]),
  }),
});

export type PlaceOrderItem = {
  productId: string;
  name: string;
  options: Record<string, string>;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type PlaceOrderResult =
  | {
      ok: true;
      code: string;
      currency: string;
      total: number;
      items: PlaceOrderItem[];
      removed: Array<{ productId: string; name: string }>;
      priceChanges: Array<{ productId: string; name: string; from: number; to: number }>;
    }
  | { ok: false; reason: "unavailable" | "rate_limited" | "invalid" | "empty" };

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asItems(value: unknown): PlaceOrderItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = asRecord(entry);
    if (!row || typeof row.productId !== "string" || typeof row.name !== "string") return [];
    const options =
      row.options && typeof row.options === "object" && !Array.isArray(row.options)
        ? Object.fromEntries(
            Object.entries(row.options as Record<string, unknown>).flatMap(([key, raw]) =>
              typeof raw === "string" ? [[key, raw]] : [],
            ),
          )
        : {};
    const quantity = Number(row.quantity);
    const unitPrice = Number(row.unitPrice);
    const lineTotal = Number(row.lineTotal);
    if (![quantity, unitPrice, lineTotal].every(Number.isFinite)) return [];
    return [{ productId: row.productId, name: row.name, options, quantity, unitPrice, lineTotal }];
  });
}

function asNamed(value: unknown): Array<{ productId: string; name: string }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    const row = asRecord(entry);
    if (!row || typeof row.productId !== "string") return [];
    return [{ productId: row.productId, name: typeof row.name === "string" ? row.name : "" }];
  });
}

export async function placeStoreOrder(raw: unknown): Promise<PlaceOrderResult> {
  try {
    const input = inputSchema.parse(raw);
    if (!isSupabaseConfigured()) return { ok: false, reason: "unavailable" };

    const ip = await requestClientIp();
    const fingerprint = `${ip ?? "na"}:${input.visitorKey ?? "anon"}`.slice(0, 80);
    const supabase = createSupabasePublicClient();
    const { data, error } = await supabase.rpc("place_store_order", {
      p_store_id: input.storeId,
      p_items: input.items.map((item) => ({
        productId: item.productId,
        name: item.name ?? "",
        quantity: item.quantity,
        options: item.options ?? {},
        clientUnitPrice: item.clientUnitPrice ?? null,
      })),
      p_customer: {
        name: input.customer.name,
        governorate: input.customer.governorate,
        address: input.customer.address ?? "",
        notes: input.customer.notes ?? "",
        payment: input.customer.payment,
      },
      p_fingerprint: fingerprint,
    });

    if (error || !data) return { ok: false, reason: "unavailable" };
    const payload = asRecord(data);
    if (!payload) return { ok: false, reason: "unavailable" };
    if (payload.ok !== true) {
      const reason = payload.reason;
      if (reason === "rate_limited" || reason === "invalid" || reason === "empty") {
        return { ok: false, reason };
      }
      return { ok: false, reason: "unavailable" };
    }
    const code = typeof payload.code === "string" ? payload.code : "";
    const currency = typeof payload.currency === "string" ? payload.currency : "";
    const total = Number(payload.total);
    if (!code || !currency || !Number.isFinite(total)) {
      return { ok: false, reason: "unavailable" };
    }
    const changes = Array.isArray(payload.priceChanges)
      ? payload.priceChanges.flatMap((entry) => {
          const row = asRecord(entry);
          if (!row || typeof row.productId !== "string") return [];
          const from = Number(row.from);
          const to = Number(row.to);
          if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
          return [
            {
              productId: row.productId,
              name: typeof row.name === "string" ? row.name : "",
              from,
              to,
            },
          ];
        })
      : [];
    return {
      ok: true,
      code,
      currency,
      total,
      items: asItems(payload.items),
      removed: asNamed(payload.removed),
      priceChanges: changes,
    };
  } catch (error) {
    unstable_rethrow(error);
    return { ok: false, reason: "unavailable" };
  }
}
