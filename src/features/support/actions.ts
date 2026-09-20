"use server";

import { toUserMessage } from "@/domain/errors";
import { getServices } from "@/infrastructure/container";
import { isSupabaseConfigured } from "@/infrastructure/supabase/config";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import {
  listSupportMessagesMemory,
  saveSupportMessageMemory,
  supportAutoReplyBody,
  type SupportMessage,
} from "@/lib/support-messages";
import { supportMessageSchema } from "@/validations/schemas";

export async function sendSupportMessageAction(input: {
  body: string;
  storeId?: string | null;
}): Promise<
  | { ok: true; userMessage: SupportMessage; systemMessage: SupportMessage }
  | { ok: false; error: string }
> {
  try {
    const data = supportMessageSchema.parse({
      body: input.body,
      storeId: input.storeId ?? null,
    });
    const { session } = await getServices().auth.requireProfile();
    const userId = session.user.id;
    const storeId = data.storeId ?? null;
    const now = new Date().toISOString();

    const userMessage: SupportMessage = {
      id: crypto.randomUUID(),
      userId,
      storeId,
      sender: "user",
      body: data.body,
      createdAt: now,
    };
    const systemMessage: SupportMessage = {
      id: crypto.randomUUID(),
      userId,
      storeId,
      sender: "system",
      body: supportAutoReplyBody(),
      createdAt: new Date(Date.now() + 1).toISOString(),
    };

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { error } = await supabase.from("support_messages").insert([
        {
          id: userMessage.id,
          user_id: userId,
          store_id: storeId,
          sender: "user",
          body: userMessage.body,
          created_at: userMessage.createdAt,
        },
        {
          id: systemMessage.id,
          user_id: userId,
          store_id: storeId,
          sender: "system",
          body: systemMessage.body,
          created_at: systemMessage.createdAt,
        },
      ]);
      if (error) {
        throw new Error(error.message);
      }
    } else {
      saveSupportMessageMemory(userMessage);
      saveSupportMessageMemory(systemMessage);
    }

    return { ok: true, userMessage, systemMessage };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}

export async function listSupportMessagesAction(): Promise<
  { ok: true; messages: SupportMessage[] } | { ok: false; error: string }
> {
  try {
    const { session } = await getServices().auth.requireProfile();
    const userId = session.user.id;

    if (isSupabaseConfigured()) {
      const supabase = await createSupabaseServerClient();
      const { data, error } = await supabase
        .from("support_messages")
        .select("id, user_id, store_id, sender, body, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100);
      if (error) throw new Error(error.message);
      const messages: SupportMessage[] = (data ?? []).map((row) => ({
        id: row.id as string,
        userId: (row.user_id as string | null) ?? null,
        storeId: (row.store_id as string | null) ?? null,
        sender: row.sender as SupportMessage["sender"],
        body: row.body as string,
        createdAt: row.created_at as string,
      }));
      return { ok: true, messages };
    }

    return { ok: true, messages: listSupportMessagesMemory(userId) };
  } catch (error) {
    return { ok: false, error: toUserMessage(error) };
  }
}
