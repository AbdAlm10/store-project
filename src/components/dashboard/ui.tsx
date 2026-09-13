import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

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
        "rounded-3xl bg-white shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]",
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

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: IconType;
  className?: string;
}) {
  return (
    <DashboardCard className={cn("relative overflow-hidden", className)} padding="md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {value}
          </p>
          {hint ? <div className="mt-3">{hint}</div> : null}
        </div>
        {Icon ? (
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-50 text-slate-400">
            <Icon className="h-5 w-5" strokeWidth={1.75} />
          </span>
        ) : null}
      </div>
    </DashboardCard>
  );
}

export function SoftTrend({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">
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
          ? "bg-sand-300 text-brand-900"
          : "bg-white text-slate-500 shadow-[0_4px_16px_-12px_rgba(58,122,86,0.25)] hover:text-brand-800",
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
      className="group flex gap-3 rounded-2xl bg-white p-4 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_-20px_rgba(15,23,42,0.28)]"
    >
      {Icon ? (
        <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition group-hover:bg-brand-50 group-hover:text-brand-700">
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
