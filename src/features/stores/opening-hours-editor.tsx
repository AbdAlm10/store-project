"use client";

import { useI18n } from "@/i18n/provider";
import type { MessageKey } from "@/i18n/messages";
import {
  type DayHours,
  type OpeningHoursSchedule,
  type Weekday,
  WEEKDAYS,
  defaultOpeningHours,
  parseOpeningHours,
} from "@/lib/opening-hours";
import { cn } from "@/lib/utils/cn";

const DAY_KEYS: Record<Weekday, MessageKey> = {
  mon: "dayMon",
  tue: "dayTue",
  wed: "dayWed",
  thu: "dayThu",
  fri: "dayFri",
  sat: "daySat",
  sun: "daySun",
};

export function OpeningHoursEditor({
  value,
  onChange,
  legacyText,
}: {
  value: string | null;
  onChange: (serialized: string) => void;
  legacyText?: string | null;
}) {
  const { t } = useI18n();
  const schedule = parseOpeningHours(value);

  function commit(next: OpeningHoursSchedule) {
    onChange(JSON.stringify(next));
  }

  function updateDay(day: Weekday, patch: Partial<DayHours>) {
    commit({
      version: 1,
      days: schedule.days.map((item) =>
        item.day === day ? { ...item, ...patch } : item,
      ),
    });
  }

  function applyWeekdays() {
    const template = schedule.days.find((d) => d.day === "mon") ?? {
      day: "mon" as const,
      closed: false,
      open: "09:00",
      close: "18:00",
    };
    commit({
      version: 1,
      days: WEEKDAYS.map((day) => ({
        day,
        closed: day === "sat" || day === "sun" ? true : template.closed,
        open: template.open,
        close: template.close,
      })),
    });
  }

  function resetDefaults() {
    commit(defaultOpeningHours());
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">
            {t("openingHours")}
          </p>
          <p className="text-xs text-slate-500">{t("openingHoursHint")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={applyWeekdays}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-brand-700 ring-1 ring-brand-200 hover:bg-brand-50"
          >
            {t("hoursCopyMonFri")}
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            {t("hoursReset")}
          </button>
        </div>
      </div>

      {legacyText ? (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {t("hoursLegacyNote")}: {legacyText}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200">
        <ul className="divide-y divide-slate-100">
          {schedule.days.map((day) => (
            <li
              key={day.day}
              className={cn(
                "grid gap-3 px-3 py-3 sm:grid-cols-[7rem_1fr_auto] sm:items-center",
                day.closed && "bg-slate-50/80",
              )}
            >
              <label className="flex items-center gap-2 text-sm font-medium text-slate-800">
                <input
                  type="checkbox"
                  checked={!day.closed}
                  onChange={(event) =>
                    updateDay(day.day, { closed: !event.target.checked })
                  }
                  className="rounded border-slate-300"
                />
                {t(DAY_KEYS[day.day])}
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{t("hoursOpen")}</span>
                  <input
                    type="time"
                    value={day.open}
                    disabled={day.closed}
                    onChange={(event) =>
                      updateDay(day.day, { open: event.target.value })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm disabled:opacity-40"
                  />
                </div>
                <span className="text-slate-300">→</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-500">{t("hoursClose")}</span>
                  <input
                    type="time"
                    value={day.close}
                    disabled={day.closed}
                    onChange={(event) =>
                      updateDay(day.day, { close: event.target.value })
                    }
                    className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm disabled:opacity-40"
                  />
                </div>
              </div>

              <span className="text-xs font-medium text-slate-500 sm:text-end">
                {day.closed ? t("hoursClosed") : `${day.open}–${day.close}`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
