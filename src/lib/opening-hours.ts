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

export function formatOpeningHoursSummary(
  schedule: OpeningHoursSchedule,
  labels: Record<Weekday, string>,
  closedLabel: string,
): string[] {
  return schedule.days.map((day) => {
    const name = labels[day.day];
    if (day.closed) return `${name}: ${closedLabel}`;
    return `${name}: ${day.open} – ${day.close}`;
  });
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
