"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ComponentType } from "react";
import {
  Boxes,
  ChevronRight,
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
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/messages";

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
}: {
  storeName?: string;
  locale: Locale;
  /** Desktop sidebar: always open, no chrome wrapper */
  embedded?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const t = createTranslator(locale);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  const navBody = (
    <>
      <div className="space-y-3 mt-5">
        {groups.map((group) => (
          <div key={group.titleKey}>
            <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {t(group.titleKey)}
            </p>
            <ul className="space-y-1">
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
                        "group flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                        active
                          ? "bg-brand-300 text-slate-900 shadow-sm shadow-brand-900/5"
                          : "text-slate-400 hover:bg-white/80 hover:text-slate-700",
                        loading && "bg-white text-brand-700 ring-1 ring-brand-200",
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-busy={loading || undefined}
                    >
                      <Icon
                        className={cn(
                          "h-[18px] w-[18px] shrink-0",
                          active ? "text-slate-900" : "text-slate-400",
                          loading && "text-brand-600",
                        )}
                        strokeWidth={1.75}
                      />
                      <span className="flex-1 truncate">{t(item.labelKey)}</span>
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-brand-600" />
                      ) : active ? (
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-800 rtl:rotate-180" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </>
  );

  if (embedded) {
    return <nav aria-label={t("menu")}>{navBody}</nav>;
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">
          {storeName ?? t("store")}
        </p>
        <Button
          variant="outline"
          size="sm"
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
          "mt-3 rounded-3xl bg-white/80 p-3 shadow-[0_8px_30px_-18px_rgba(15,23,42,0.18)]",
          open ? "block" : "hidden",
        )}
      >
        {navBody}
      </nav>
    </>
  );
}
