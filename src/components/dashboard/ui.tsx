import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

const cardShadow =
  "shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]";

export function DashboardCard({
  children,
  className,
  padding = "md",
}: {
  children: ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pads = {
    none: "",
    sm: "p-4",
    md: "p-5 sm:p-6",
    lg: "p-6 sm:p-8",
  } as const;

  return (
    <div
      className={cn(
        "rounded-[1.35rem] border border-slate-100/80 bg-white",
        cardShadow,
        pads[padding],
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-3", className)}>
      <div>
        <h2 className="text-base font-semibold tracking-tight text-slate-900">
          {title}
        </h2>
        {description ? (
          <p className="mt-0.5 text-sm text-slate-400">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type IconType = ComponentType<{ className?: string; strokeWidth?: number }>;

const STAT_TONES = {
  mint: "bg-[#eef8f2]",
  sand: "bg-[#f7f2e8]",
  mist: "bg-[#f3f5f8]",
  sage: "bg-[#eef6f0]",
} as const;

export type StatTone = keyof typeof STAT_TONES;

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "mist",
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconType;
  tone?: StatTone;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.25rem] p-3.5 sm:rounded-[1.35rem] sm:p-6",
        STAT_TONES[tone],
        className,
      )}
    >
      <div className="flex items-start justify-between gap-2 sm:gap-3">
        <div className="min-w-0">
          <p className="text-xs text-slate-500 sm:text-sm">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-slate-900 sm:mt-2 sm:text-3xl">
            {value}
          </p>
          {hint ? <div className="mt-2 sm:mt-3">{hint}</div> : null}
        </div>
        {Icon ? (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/70 text-slate-500 sm:h-10 sm:w-10 sm:rounded-2xl">
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

export function SoftTrend({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/80 px-2 py-0.5 text-xs font-semibold text-brand-700">
      {children}
    </span>
  );
}

export function PillLink({
  href,
  active,
  children,
}: {
  href: string;
  active?: boolean;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white shadow-sm shadow-brand-900/15"
          : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800",
      )}
    >
      {children}
    </Link>
  );
}

export function ActionTile({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description: string;
  icon?: IconType;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group flex gap-3 rounded-[1.25rem] border border-slate-100/80 bg-white p-4 transition hover:-translate-y-0.5 hover:border-brand-200/60 hover:shadow-[0_14px_34px_-22px_rgba(58,122,86,0.35)]",
        cardShadow,
      )}
    >
      {Icon ? (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-100">
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </span>
      ) : null}
      <span className="min-w-0">
        <span className="block font-semibold text-slate-900">{label}</span>
        <span className="mt-1 block text-sm text-slate-400">{description}</span>
      </span>
    </Link>
  );
}
