"use client";

import { useI18n } from "@/i18n/provider";
import {
  formatOpeningHoursSummary,
  isLegacyOpeningHoursText,
  isOpenNow,
  parseOpeningHours,
  weekdayFromDate,
  type Weekday,
} from "@/lib/opening-hours";
import { cn } from "@/lib/utils/cn";
import { Clock } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

/**
 * Clock + open/closed label. Click opens a small hours panel
 * (same pattern as filter sort toggle / select menus).
 * Client-only status avoids SSR timezone hydration mismatch.
 */
export function StoreOpenStatus({
  openingHours,
}: {
  openingHours: string | null;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [isOpen, setIsOpen] = useState<boolean | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const legacy = isLegacyOpeningHoursText(openingHours);

  useEffect(() => {
    if (legacy) {
      setIsOpen(null);
      return;
    }
    const schedule = parseOpeningHours(openingHours);
    const sync = () => setIsOpen(isOpenNow(schedule));
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, [openingHours, legacy]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const labels = {
    mon: t("dayMon"),
    tue: t("dayTue"),
    wed: t("dayWed"),
    thu: t("dayThu"),
    fri: t("dayFri"),
    sat: t("daySat"),
    sun: t("daySun"),
  } satisfies Record<Weekday, string>;

  const hoursLines = legacy
    ? null
    : formatOpeningHoursSummary(
        parseOpeningHours(openingHours),
        labels,
        t("hoursClosed"),
      );

  const statusLabel =
    isOpen === null
      ? t("openingHours")
      : isOpen
        ? t("storeOpenNow")
        : t("storeClosedNow");

  const statusColor =
    isOpen === null
      ? "var(--store-muted)"
      : isOpen
        ? "#16a34a"
        : "#dc2626";

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-semibold transition hover:opacity-90 active:scale-[0.98] sm:text-sm"
        style={{
          background:
            "color-mix(in srgb, var(--store-surface) 88%, transparent)",
          boxShadow:
            "inset 0 0 0 1px color-mix(in srgb, var(--store-border) 55%, transparent)",
          color: statusColor,
        }}
      >
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>{statusLabel}</span>
      </button>

      {open ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("openingHours")}
          className={cn(
            "absolute top-[calc(100%+0.4rem)] z-40 w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl p-3 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.35)]",
            "end-0",
          )}
          style={{
            background: "var(--store-surface)",
            color: "var(--store-text)",
            boxShadow:
              "0 16px 40px -20px rgba(15,23,42,0.35), inset 0 0 0 1px color-mix(in srgb, var(--store-border) 70%, transparent)",
          }}
        >
          <p
            className="mb-2 text-xs font-bold tracking-tight"
            style={{ fontFamily: "var(--store-font-display)" }}
          >
            {t("openingHours")}
          </p>
          {legacy && openingHours ? (
            <p
              className="text-xs leading-relaxed"
              style={{ color: "var(--store-muted)" }}
            >
              {openingHours}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {(hoursLines ?? []).map((line) => {
                const dayKey = (
                  Object.keys(labels) as Weekday[]
                ).find((key) => line.startsWith(labels[key]));
                const isToday = dayKey === weekdayFromDate();
                return (
                  <li
                    key={line}
                    className={cn(
                      "rounded-lg px-2 py-1 text-xs",
                      isToday && "font-semibold",
                    )}
                    style={
                      isToday
                        ? {
                            background:
                              "color-mix(in srgb, var(--store-accent) 12%, transparent)",
                            color: "var(--store-text)",
                          }
                        : { color: "var(--store-muted)" }
                    }
                  >
                    {line}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
