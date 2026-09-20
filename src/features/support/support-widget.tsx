"use client";

import { Button } from "@/components/ui/button";
import {
  listSupportMessagesAction,
  sendSupportMessageAction,
} from "@/features/support/actions";
import { useI18n } from "@/i18n/provider";
import type { SupportMessage } from "@/lib/support-messages";
import { cn } from "@/lib/utils/cn";
import { Headphones, Loader2, Send, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";

type ChatLine = {
  id: string;
  sender: "user" | "system";
  body: string;
};

function toLine(message: SupportMessage): ChatLine {
  return {
    id: message.id,
    sender: message.sender,
    body: message.body,
  };
}

export function SupportWidget({
  storeId = null,
}: {
  storeId?: string | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState<ChatLine[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [pending, startTransition] = useTransition();
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (!open || loaded) return;
    startTransition(async () => {
      const result = await listSupportMessagesAction();
      if (result.ok) {
        setLines(result.messages.map(toLine));
      }
      setLoaded(true);
    });
  }, [open, loaded]);

  useEffect(() => {
    if (!open) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    inputRef.current?.focus();
  }, [open, lines.length]);

  function send() {
    const body = draft.trim();
    if (!body || pending) return;
    setError(null);
    setDraft("");
    startTransition(async () => {
      const result = await sendSupportMessageAction({ body, storeId });
      if (!result.ok) {
        setError(result.error);
        setDraft(body);
        return;
      }
      setLines((current) => [
        ...current,
        toLine(result.userMessage),
        toLine(result.systemMessage),
      ]);
    });
  }

  return (
    <div className="pointer-events-none fixed bottom-5 left-5 z-[120] flex flex-col items-start gap-3">
      {open ? (
        <div
          className="pointer-events-auto flex h-[min(28rem,70dvh)] w-[min(22rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-white shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]"
          role="dialog"
          aria-label={t("supportChatTitle")}
        >
          <div className="flex items-center justify-between gap-3 bg-slate-950 px-4 py-3 text-white">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">
                {t("supportChatTitle")}
              </p>
              <p className="truncate text-xs text-slate-300">
                {t("supportChatSubtitle")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
              aria-label={t("close")}
            >
              <X className="h-4 w-4" strokeWidth={2} />
            </button>
          </div>

          <div className="flex-1 space-y-2.5 overflow-y-auto bg-[#f7f8f7] px-3 py-3">
            {lines.length === 0 && loaded ? (
              <p className="rounded-2xl bg-white px-3 py-2 text-xs leading-relaxed text-slate-500 shadow-sm">
                {t("supportChatEmpty")}
              </p>
            ) : null}
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed shadow-sm",
                  line.sender === "user"
                    ? "ms-auto bg-brand-700 text-white"
                    : "me-auto bg-white text-slate-700",
                )}
              >
                {line.body}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-slate-100 bg-white p-3">
            {error ? (
              <p className="mb-2 text-xs text-red-600" role="alert">
                {error}
              </p>
            ) : null}
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                rows={2}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send();
                  }
                }}
                placeholder={t("supportChatPlaceholder")}
                className="min-h-[2.75rem] flex-1 resize-none rounded-2xl border-0 bg-slate-100 px-3 py-2 text-sm text-slate-800 outline-none ring-brand-500 placeholder:text-slate-400 focus:ring-2"
                disabled={pending}
              />
              <Button
                type="button"
                size="sm"
                className="h-10 w-10 shrink-0 rounded-full p-0"
                onClick={send}
                disabled={pending || !draft.trim()}
                aria-label={t("supportChatSend")}
              >
                {pending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" strokeWidth={2} />
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "pointer-events-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-slate-950 text-white shadow-[0_16px_40px_-18px_rgba(15,23,42,0.55)] transition hover:-translate-y-0.5 hover:bg-slate-800",
          open && "bg-brand-700 hover:bg-brand-800",
        )}
        aria-label={open ? t("close") : t("supportChatOpen")}
        aria-expanded={open}
      >
        {open ? (
          <X className="h-5 w-5" strokeWidth={2} />
        ) : (
          <Headphones className="h-5 w-5" strokeWidth={1.85} />
        )}
      </button>
    </div>
  );
}
