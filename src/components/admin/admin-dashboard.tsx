"use client";

import { StatusBadge } from "@/components/dashboard/status-badge";
import { Input } from "@/components/ui/forms";
import {
  adminChangeStorePlan,
  adminToggleStoreSuspended,
} from "@/features/admin/actions";
import {
  formatDateAr,
  PLAN_LABEL_AR,
  remainingDays,
  subscriptionPeriodEnd,
} from "@/features/admin/labels";
import {
  planPrice,
  PLANS,
  type BillingPeriod,
  type PlanId,
} from "@/config/plans";
import { isSubscriptionUsable } from "@/domain/rules/store-rules";
import type { AdminOverview } from "@/application/services/admin-platform-service";
import { cn } from "@/lib/utils/cn";
import {
  Check,
  ChevronDown,
  Loader2,
  Pause,
  Play,
  Search,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  useDeferredValue,
  useEffect,
  forwardRef,
  useMemo,
  useRef,
  useState,
} from "react";
import { useFormStatus } from "react-dom";
import { createPortal } from "react-dom";

const PLAN_SELECTOR_LABELS: Record<PlanId, string> = {
  trial: "تجربة",
  basic: "أساسي",
  pro: "برو",
};

type Props = {
  overview: AdminOverview;
  mode: "memory" | "supabase";
  serviceRoleConfigured: boolean;
};

function matchesStoreRow(
  row: AdminOverview["stores"][number],
  query: string,
): boolean {
  if (!query) return true;
  const haystack = [
    row.store.name,
    row.store.slug,
    row.store.id,
    row.store.ownerId,
    row.owner?.email,
    row.owner?.fullName,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  const tokens = query.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export function AdminDashboard({
  overview,
  mode,
  serviceRoleConfigured,
}: Props) {
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim().toLowerCase());
  const isSearchPending = search.trim().toLowerCase() !== deferredSearch;

  const stores = useMemo(() => {
    return overview.stores.filter((row) =>
      matchesStoreRow(row, deferredSearch),
    );
  }, [overview.stores, deferredSearch]);

  return (
    <div className="space-y-4 pb-8">
      {mode === "supabase" && !serviceRoleConfigured ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          أضف <code className="text-xs">SUPABASE_SERVICE_ROLE_KEY</code> في
          الخادم.
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <Stat label="المتاجر" value={overview.stats.storeCount} />
        <Stat
          label="اشتراكات فعّالة"
          value={overview.stats.activeSubscriptions}
          accent="brand"
          compactLabel="فعّالة"
        />
        <Stat
          label="متاجر موقوفة"
          value={overview.stats.suspendedStores}
          accent="warn"
          compactLabel="موقوفة"
        />
      </div>

      <div className="relative">
        <Search
          className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
          strokeWidth={1.75}
        />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="بحث: اسم المتجر، المستخدم، أو المعرّف…"
          aria-label="بحث المتاجر"
          className="h-10 rounded-xl bg-white ps-9 pe-9 text-sm ring-1 ring-slate-200"
        />
        <div className="absolute end-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {isSearchPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : null}
          {search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="rounded-md p-1 text-slate-400 hover:bg-slate-100"
              aria-label="مسح"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <p className="text-xs text-slate-500">
        {deferredSearch ? `${stores.length} نتيجة` : `${overview.stores.length} متجر`}
      </p>

      <ul className="space-y-2">
        {stores.map((row) => (
          <li key={row.store.id}>
            <StoreAdminCard row={row} />
          </li>
        ))}
      </ul>

      {stores.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">لا نتائج</p>
      ) : null}
    </div>
  );
}

function StoreAdminCard({
  row,
}: {
  row: AdminOverview["stores"][number];
}) {
  const { store, subscription, owner } = row;
  const subUsable = subscription ? isSubscriptionUsable(subscription) : false;
  const daysLeft = remainingDays(
    subscription ? subscriptionPeriodEnd(subscription) : null,
  );

  return (
    <article className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-start gap-3">
        <StoreLogo name={store.name} logoUrl={store.logoUrl} />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="text-sm font-bold text-slate-900">{store.name}</span>
            <Link
              href={`/${store.slug}`}
              target="_blank"
              className="text-xs font-semibold text-brand-700 hover:underline"
            >
              /{store.slug}
            </Link>
            <span className="text-xs text-slate-400">·</span>
            <time dateTime={store.createdAt} className="text-xs text-slate-500">
              {formatDateAr(store.createdAt)}
            </time>
          </div>

          <p className="mt-0.5 break-all font-mono text-[11px] leading-snug text-slate-500">
            {store.id}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-xs text-slate-600">
              {owner?.fullName ?? owner?.email ?? "—"}
              {owner?.email ? (
                <span className="text-slate-400"> · {owner.email}</span>
              ) : null}
            </p>
          </div>

          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {store.suspendedAt || store.status === "restricted" ? (
              <StatusBadge status="restricted" />
            ) : (
              <StatusBadge status={store.status} />
            )}
            {subscription ? (
              <>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[11px] font-bold",
                    subUsable
                      ? "bg-brand-50 text-brand-800"
                      : "bg-orange-50 text-orange-800",
                  )}
                >
                  {PLAN_LABEL_AR[subscription.planId]}
                </span>
                {daysLeft !== null && subUsable ? (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-900">
                    {daysLeft} يوم
                  </span>
                ) : null}
              </>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                بدون اشتراك
              </span>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1.5">
          <PlanMenu
            storeId={store.id}
            currentPlanId={subscription?.planId ?? null}
            currentBillingPeriod={subscription?.billingPeriod ?? null}
          />
          <SuspendToggle
            storeId={store.id}
            locked={
              Boolean(store.suspendedAt) || store.status === "restricted"
            }
          />
        </div>
      </div>
    </article>
  );
}

function PlanMenu({
  storeId,
  currentPlanId,
  currentBillingPeriod,
}: {
  storeId: string;
  currentPlanId: PlanId | null;
  currentBillingPeriod: BillingPeriod | null;
}) {
  const [open, setOpen] = useState<"plan" | "period" | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuStyle, setMenuStyle] = useState<{
    top: number;
    right: number;
  } | null>(null);

  useEffect(() => {
    if (!open || !anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setMenuStyle({
      top: rect.bottom + 6,
      right: window.innerWidth - rect.right,
    });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function close() {
      setOpen(null);
    }
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [open]);

  return (
    <>
      <div className="flex items-center gap-1">
        <SelectorButton
          ref={anchorRef}
          label={
            currentPlanId === "trial"
              ? PLAN_SELECTOR_LABELS.trial
              : currentPlanId
                ? PLAN_SELECTOR_LABELS[currentPlanId]
                : "اختر الخطة"
          }
          value={
            currentPlanId && currentPlanId !== "trial"
              ? `$${planPrice(PLANS[currentPlanId], currentBillingPeriod ?? "monthly")}`
              : currentPlanId === "trial"
                ? "10 أيام"
                : "—"
          }
          expanded={open === "plan"}
          onClick={() => setOpen((value) => (value === "plan" ? null : "plan"))}
          ariaLabel="نوع الاشتراك"
        />
        <SelectorButton
          label={currentBillingPeriod === "yearly" ? "سنوي" : "شهري"}
          value={
            currentBillingPeriod === "yearly" ? "365 يوم" : "30 يوم"
          }
          expanded={open === "period"}
          onClick={() =>
            setOpen((value) => (value === "period" ? null : "period"))
          }
          ariaLabel="فترة الاشتراك"
        />
      </div>

      {open && menuStyle && typeof document !== "undefined"
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[100] cursor-default bg-transparent"
                aria-label="إغلاق"
                onClick={() => setOpen(null)}
              />
              <div
                role="menu"
                className="fixed z-[101] min-w-[11rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-slate-200"
                style={{
                  top: menuStyle.top,
                  right: menuStyle.right,
                }}
              >
                <p className="border-b border-slate-100 px-3 py-2 text-xs font-bold text-slate-500">
                  {open === "plan" ? "نوع الاشتراك" : "فترة الاشتراك"}
                </p>
                {open === "plan"
                    ? (["trial", "basic", "pro"] as const).map((planId) => (
                      <PlanMenuItem
                        key={planId}
                        storeId={storeId}
                        planId={planId}
                        billingPeriod={currentBillingPeriod ?? "monthly"}
                        selected={currentPlanId === planId}
                        label={PLAN_SELECTOR_LABELS[planId]}
                        onDone={() => setOpen(null)}
                      />
                    ))
                  : (["monthly", "yearly"] as const).map((billingPeriod) => (
                      <PlanMenuItem
                        key={billingPeriod}
                        storeId={storeId}
                        planId={
                          currentPlanId ?? "trial"
                        }
                        billingPeriod={billingPeriod}
                        selected={currentBillingPeriod === billingPeriod}
                        label={billingPeriod === "yearly" ? "سنوي" : "شهري"}
                        onDone={() => setOpen(null)}
                      />
                    ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}

const SelectorButton = forwardRef<
  HTMLButtonElement,
  {
    label: string;
    value: string;
    expanded: boolean;
    disabled?: boolean;
    onClick: () => void;
    ariaLabel: string;
  }
>(function SelectorButton(
  { label, value, expanded, disabled, onClick, ariaLabel },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-10 min-w-[7rem] items-center justify-between gap-1 rounded-xl border px-2.5 text-right text-xs shadow-sm transition disabled:cursor-default disabled:opacity-70",
        expanded
          ? "border-brand-300 bg-brand-50 text-brand-950 ring-2 ring-brand-100"
          : "border-slate-200 bg-white text-slate-700 hover:border-brand-200 hover:bg-slate-50",
      )}
      aria-expanded={expanded}
      aria-haspopup="menu"
      aria-label={ariaLabel}
    >
      <span className="font-semibold">{label}</span>
      <span className="flex items-center gap-1">
        <span className="text-[10px] font-bold text-slate-500">{value}</span>
        <ChevronDown className="h-3.5 w-3.5 text-slate-400" />
      </span>
    </button>
  );
});

function PlanMenuItem({
  storeId,
  planId,
  billingPeriod,
  selected,
  label,
  onDone,
}: {
  storeId: string;
  planId: PlanId;
  billingPeriod: BillingPeriod;
  selected: boolean;
  label: string;
  onDone: () => void;
}) {
  return (
    <form action={adminChangeStorePlan} onSubmit={onDone}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="planId" value={planId} />
      <input type="hidden" name="billingPeriod" value={billingPeriod} />
      <PlanMenuSubmit
        selected={selected}
        label={label}
      />
    </form>
  );
}

function PlanMenuSubmit({
  selected,
  label,
}: {
  selected: boolean;
  label: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="menuitem"
      disabled={pending}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-60",
        selected && "bg-brand-50 text-brand-900",
      )}
    >
      {label}
      {selected ? (
        <Check className="h-4 w-4 text-brand-700" />
      ) : pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : null}
    </button>
  );
}

function SuspendToggle({
  storeId,
  locked,
}: {
  storeId: string;
  locked: boolean;
}) {
  return (
    <form action={adminToggleStoreSuspended}>
      <input type="hidden" name="storeId" value={storeId} />
      <input type="hidden" name="suspended" value={locked ? "false" : "true"} />
      <SuspendSubmit locked={locked} />
    </form>
  );
}

function SuspendSubmit({ locked }: { locked: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-lg ring-1 transition disabled:opacity-60",
        locked
          ? "bg-emerald-600 text-white ring-emerald-700 hover:bg-emerald-700"
          : "bg-red-600 text-white ring-red-700 hover:bg-red-700",
      )}
      aria-label={locked ? "استئناف المتجر" : "إيقاف المتجر"}
      title={locked ? "استئناف المتجر" : "إيقاف المتجر (تقييد كامل)"}
    >
      {pending ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : locked ? (
        <Play className="h-4 w-4 fill-current" />
      ) : (
        <Pause className="h-4 w-4 fill-current" />
      )}
    </button>
  );
}

function StoreLogo({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const initial = name.trim().charAt(0) || "؟";
  if (logoUrl) {
    return (
      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-200">
        <Image
          src={logoUrl}
          alt=""
          fill
          className="object-cover"
          sizes="44px"
          unoptimized
        />
      </div>
    );
  }
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-sm font-bold text-brand-800 ring-1 ring-brand-100">
      {initial}
    </div>
  );
}

function Stat({
  label,
  value,
  accent = "default",
  compactLabel,
}: {
  label: string;
  value: number;
  accent?: "default" | "brand" | "warn";
  compactLabel?: string;
}) {
  return (
    <div className="rounded-xl bg-white px-2 py-2 ring-1 ring-slate-200">
      <p className="truncate text-[10px] font-semibold text-slate-500 sm:text-xs">
        <span className="sm:hidden">{compactLabel ?? label}</span>
        <span className="hidden sm:inline">{label}</span>
      </p>
      <p
        className={cn(
          "text-xl font-bold leading-tight sm:text-2xl",
          accent === "brand" && "text-brand-800",
          accent === "warn" && "text-orange-700",
          accent === "default" && "text-slate-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}
