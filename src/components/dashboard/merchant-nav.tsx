"use client";

import { useDashboardPaths } from "@/components/dashboard/dashboard-paths";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";
import {
  Boxes,
  ClipboardList,
  CreditCard,
  Home,
  Layers,
  LockKeyhole,
  Loader2,
  Menu,
  Palette,
  PieChart,
  Settings2,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ComponentType } from "react";

type NavIcon = ComponentType<{ className?: string; strokeWidth?: number }>;

type NavItem = {
  path: string;
  labelKey: MessageKey;
  icon: NavIcon;
};

type NavGroup = { titleKey: MessageKey; items: NavItem[] };

const groups: NavGroup[] = [
  {
    titleKey: "overview",
    items: [{ path: "", labelKey: "home", icon: Home }],
  },
  {
    titleKey: "catalog",
    items: [
      { path: "/products", labelKey: "products", icon: Boxes },
      { path: "/categories", labelKey: "categories", icon: Layers },
    ],
  },
  {
    titleKey: "store",
    items: [
      { path: "/store", labelKey: "storefront", icon: Store },
      { path: "/store-design", labelKey: "design", icon: Palette },
    ],
  },
  {
    titleKey: "growth",
    items: [{ path: "/analytics", labelKey: "analytics", icon: PieChart }],
  },
  {
    titleKey: "account",
    items: [
      { path: "/settings", labelKey: "settings", icon: Settings2 },
      { path: "/subscription", labelKey: "subscription", icon: CreditCard },
    ],
  },
];

const ordersItem: NavItem = { path: "/orders", labelKey: "orders", icon: ClipboardList };

function hrefFor(base: string, path: string): string {
  return path ? `${base}${path}` : base;
}

function isActive(pathname: string, href: string, base: string): boolean {
  if (href === base) return pathname === base;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isAllowedWhenLocked(path: string): boolean {
  return path === "" || path === "/subscription" || path === "/settings";
}

export function MerchantNav({
  storeName,
  locale,
  embedded = false,
  compact = false,
  locked = false,
}: {
  storeName?: string;
  locale: Locale;
  /** Desktop sidebar: always open, no chrome wrapper */
  embedded?: boolean;
  /** Mobile top bar: menu button only (no store name) */
  compact?: boolean;
  locked?: boolean;
}) {
  const pathname = usePathname();
  const paths = useDashboardPaths();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const compactRootRef = useRef<HTMLDivElement>(null);
  const t = createTranslator(locale);

  useEffect(() => {
    setPendingHref(null);
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!compact || !open) return;

    function onPointerDown(event: MouseEvent) {
      if (!compactRootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
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
  }, [compact, open]);

  const navGroups = groups.map((group) =>
    group.titleKey === "catalog" && paths.orders
      ? { ...group, items: [...group.items, ordersItem] }
      : group,
  );

  const navBody = (
    <div className={cn(compact ? "space-y-1" : "space-y-4", "mt-0.5")}>
      {navGroups.map((group) => (
        <div key={group.titleKey}>
          <p
            className={cn(
              "px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400",
              compact ? "mb-0.5" : "mb-1.5",
            )}
          >
            {t(group.titleKey)}
          </p>
          <ul className={compact ? "space-y-0" : "space-y-0.5"}>
            {group.items.map((item) => {
              const href = hrefFor(paths.base, item.path);
              const active = isActive(pathname, href, paths.base);
              const loading = pendingHref === href && !active;
              const Icon = item.icon;
              const disabled = locked && !isAllowedWhenLocked(item.path);

              return (
                <li key={href}>
                  {disabled ? (
                    <button
                      type="button"
                      disabled
                      aria-disabled="true"
                      title={t("subscriptionExpiredMessage")}
                      className={cn(
                        "group relative flex w-full cursor-not-allowed items-center gap-2.5 rounded-2xl px-3 text-sm font-medium text-slate-400 opacity-70",
                        compact ? "py-1.5" : "py-2.5",
                      )}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                      <span className="min-w-0 flex-1 truncate text-start">{t(item.labelKey)}</span>
                      <LockKeyhole className="h-3.5 w-3.5 shrink-0" strokeWidth={2} />
                    </button>
                  ) : (
                    <Link
                      href={href}
                      prefetch
                      onClick={() => {
                        if (active) return;
                        setOpen(false);
                        setPendingHref(href);
                      }}
                      className={cn(
                        "group relative flex items-center gap-2.5 rounded-2xl px-3 text-sm font-medium transition-colors",
                        compact ? "py-1.5" : "py-2.5",
                        active
                          ? "bg-brand-50 text-brand-900"
                          : "text-slate-500 hover:bg-slate-50 hover:text-slate-800",
                        loading && "bg-brand-50 text-brand-700 ring-1 ring-brand-200",
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-busy={loading || undefined}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          active ? "text-brand-700" : "text-slate-400",
                          loading && "text-brand-600",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="min-w-0 flex-1 truncate">{t(item.labelKey)}</span>
                      {loading ? (
                        <Loader2 className="pointer-events-none absolute end-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-brand-600" />
                      ) : null}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );

  if (embedded) {
    return <nav aria-label={t("menu")}>{navBody}</nav>;
  }

  if (compact) {
    return (
      <div ref={compactRootRef} className="relative shrink-0">
        <Button
          variant="ghost"
          size="sm"
          className="relative z-[60] h-9 gap-1.5 px-3 border-none"
          aria-expanded={open}
          aria-controls="merchant-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {t("menu")}
        </Button>

        {open ? (
          <>
            <button
              type="button"
              aria-label={t("menu")}
              className="fixed inset-0 z-[55] bg-slate-900/25"
              onClick={() => setOpen(false)}
            />
            <nav
              id="merchant-nav"
              className="fixed inset-x-3 top-[calc(var(--demo-banner-offset,0px)+3.75rem)] z-[60] max-h-[calc(100dvh-var(--demo-banner-offset,0px)-4.5rem)] overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)]"
            >
              {navBody}
            </nav>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {storeName ?? t("store")}
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="border-none"
          aria-expanded={open}
          aria-controls="merchant-nav"
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          {t("menu")}
        </Button>
      </div>

      <nav
        id="merchant-nav"
        className={cn(
          "mt-3 rounded-3xl border border-slate-100 bg-white p-3 shadow-[0_10px_40px_-24px_rgba(15,23,42,0.18)]",
          open ? "block" : "hidden",
        )}
      >
        {navBody}
      </nav>
    </>
  );
}
