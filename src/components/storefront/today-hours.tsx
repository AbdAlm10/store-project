"use client";

import { useEffect, useState } from "react";
import { Clock } from "lucide-react";
import {
  formatOpeningHoursSummary,
  parseOpeningHours,
  type Weekday,
} from "@/lib/opening-hours";

const DAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** Client-only “today” hours — avoids SSR/client Date timezone hydration mismatch. */
export function TodayHours({
  openingHours,
  closedLabel,
}: {
  openingHours: string | null;
  closedLabel: string;
}) {
  const [line, setLine] = useState<string | null>(null);

  useEffect(() => {
    const schedule = parseOpeningHours(openingHours);
    const hoursLines = formatOpeningHoursSummary(
      schedule,
      DAY_LABELS,
      closedLabel,
    );
    const weekdayOrder: Weekday[] = [
      "mon",
      "tue",
      "wed",
      "thu",
      "fri",
      "sat",
      "sun",
    ];
    const todayKey = weekdayOrder[(new Date().getDay() + 6) % 7];
    setLine(
      hoursLines.find((item) => item.startsWith(DAY_LABELS[todayKey])) ?? null,
    );
  }, [openingHours, closedLabel]);

  if (!line) return null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Clock className="h-3.5 w-3.5" aria-hidden />
      {line}
    </span>
  );
}
