import Link from "next/link";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl tracking-tight text-slate-900">
          {title}
        </h1>
        {description ? (
          <p className="mt-1 max-w-2xl text-sm text-slate-600">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

export { StatusBadge } from "@/components/dashboard/status-badge";

export function QuickAction({
  href,
  label,
  description,
}: {
  href: string;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl bg-white p-4 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-900/5"
    >
      <p className="font-semibold text-slate-900">{label}</p>
      <p className="mt-1 text-sm text-slate-500">{description}</p>
    </Link>
  );
}
