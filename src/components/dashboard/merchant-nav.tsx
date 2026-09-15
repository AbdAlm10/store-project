"use client";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/messages";
import { cn } from "@/lib/utils/cn";
import {
  Boxes,
  CreditCard,
  Home,
  Layers,
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
  href: string;
  labelKey: MessageKey;
  icon: NavIcon;
};

type NavGroup = { titleKey: MessageKey; items: NavItem[] };

const groups: NavGroup[] = [
  {
    titleKey: "overview",
    items: [{ href: "/dashboard", labelKey: "home", icon: Home }],
  },
  {
    titleKey: "catalog",
    items: [
      { href: "/dashboard/products", labelKey: "products", icon: Boxes },
      { href: "/dashboard/categories", labelKey: "categories", icon: Layers },
    ],
  },
  {
    titleKey: "store",
    items: [
      { href: "/dashboard/store", labelKey: "storefront", icon: Store },
      { href: "/dashboard/store-design", labelKey: "design", icon: Palette },
    ],
  },
  {
    titleKey: "growth",
    items: [
      { href: "/dashboard/analytics", labelKey: "analytics", icon: PieChart },
    ],
  },
  {
    titleKey: "account",
    items: [
      { href: "/dashboard/settings", labelKey: "settings", icon: Settings2 },
      {
        href: "/dashboard/subscription",
        labelKey: "subscription",
        icon: CreditCard,
      },
    ],
  },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function MerchantNav({
  storeName,
  locale,
  embedded = false,
  compact = false,
}: {
  storeName?: string;
  locale: Locale;
  /** Desktop sidebar: always open, no chrome wrapper */
  embedded?: boolean;
  /** Mobile top bar: menu button only (no store name) */
  compact?: boolean;
}) {
  const pathname = usePathname();
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

  const navBody = (
    <div className={cn("space-y-4", embedded ? "mt-1" : "mt-1")}>
      {groups.map((group) => (
        <div key={group.titleKey}>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {t(group.titleKey)}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const loading = pendingHref === item.href && !active;
              const Icon = item.icon;

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={() => {
                      if (active) return;
                      setOpen(false);
                      setPendingHref(item.href);
                    }}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
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
              className="fixed inset-x-3 top-[3.75rem] z-[60] max-h-[min(70dvh,28rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-100 bg-white p-3 shadow-[0_20px_50px_-20px_rgba(15,23,42,0.45)] ys-scrollbar-none"
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
