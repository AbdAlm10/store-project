export type Weekday = "sun" | "mon" | "tue" | "wed" | "thu" | "fri" | "sat";

export type DayHours = {
  day: Weekday;
  closed: boolean;
  open: string;
  close: string;
};

export type OpeningHoursSchedule = {
  version: 1;
  days: DayHours[];
};

export const WEEKDAYS: Weekday[] = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
];

export function defaultOpeningHours(): OpeningHoursSchedule {
  return {
    version: 1,
    days: WEEKDAYS.map((day) => ({
      day,
      closed: day === "sun",
      open: "09:00",
      close: "18:00",
    })),
  };
}

export function parseOpeningHours(
  raw: string | null | undefined,
): OpeningHoursSchedule {
  if (!raw?.trim()) return defaultOpeningHours();
  try {
    const parsed = JSON.parse(raw) as OpeningHoursSchedule;
    if (parsed?.version === 1 && Array.isArray(parsed.days)) {
      const byDay = new Map(parsed.days.map((item) => [item.day, item]));
      return {
        version: 1,
        days: WEEKDAYS.map((day) => {
          const existing = byDay.get(day);
          return (
            existing ?? {
              day,
              closed: day === "sun",
              open: "09:00",
              close: "18:00",
            }
          );
        }),
      };
    }
  } catch {
    // Legacy free-text → keep as all-day note via closed=false default copy
  }
  return defaultOpeningHours();
}

export function serializeOpeningHours(schedule: OpeningHoursSchedule): string {
  return JSON.stringify(schedule);
}

/** Display "09:00" / "18:00" as 12-hour Arabic (e.g. 9:00 ص، 6:00 م). */
export function formatTime12h(value: string): string {
  const [hRaw, mRaw] = value.split(":").map(Number);
  const hours24 = Number.isFinite(hRaw) ? hRaw : 0;
  const minutes = Number.isFinite(mRaw) ? mRaw : 0;
  const period = hours24 >= 12 ? "م" : "ص";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, "0")} ${period}`;
}

export function formatOpeningHoursSummary(
  schedule: OpeningHoursSchedule,
  labels: Record<Weekday, string>,
  closedLabel: string,
): string[] {
  return schedule.days.map((day) => {
    const name = labels[day.day];
    if (day.closed) return `${name}: ${closedLabel}`;
    return `${name}: ${formatTime12h(day.open)} – ${formatTime12h(day.close)}`;
  });
}

export function weekdayFromDate(date: Date = new Date()): Weekday {
  const order: Weekday[] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];
  return order[(date.getDay() + 6) % 7];
}

export function getDayHours(
  schedule: OpeningHoursSchedule,
  date: Date = new Date(),
): DayHours {
  const today = weekdayFromDate(date);
  return (
    schedule.days.find((day) => day.day === today) ?? {
      day: today,
      closed: true,
      open: "09:00",
      close: "18:00",
    }
  );
}

function timeToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
}

/** Whether the store is open at `date` (local browser time). */
export function isOpenNow(
  schedule: OpeningHoursSchedule,
  date: Date = new Date(),
): boolean {
  const today = getDayHours(schedule, date);
  if (today.closed) return false;
  const now = date.getHours() * 60 + date.getMinutes();
  const open = timeToMinutes(today.open);
  const close = timeToMinutes(today.close);
  if (close <= open) {
    // Overnight window (e.g. 22:00–02:00)
    return now >= open || now < close;
  }
  return now >= open && now < close;
}

export function isLegacyOpeningHoursText(raw: string | null | undefined): boolean {
  if (!raw?.trim()) return false;
  try {
    const parsed = JSON.parse(raw) as { version?: number };
    return parsed?.version !== 1;
  } catch {
    return true;
  }
}
