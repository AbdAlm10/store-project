"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Loader2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/i18n/config";
import { createTranslator, type MessageKey } from "@/i18n/messages";

type NavItem = { href: string; labelKey: MessageKey };
type NavGroup = { titleKey: MessageKey; items: NavItem[] };

const groups: NavGroup[] = [
  {
    titleKey: "overview",
    items: [{ href: "/dashboard", labelKey: "home" }],
  },
  {
    titleKey: "catalog",
    items: [
      { href: "/dashboard/products", labelKey: "products" },
      { href: "/dashboard/categories", labelKey: "categories" },
    ],
  },
  {
    titleKey: "store",
    items: [
      { href: "/dashboard/store", labelKey: "storefront" },
      { href: "/dashboard/store-design", labelKey: "design" },
    ],
  },
  {
    titleKey: "growth",
    items: [{ href: "/dashboard/analytics", labelKey: "analytics" }],
  },
  {
    titleKey: "account",
    items: [
      { href: "/dashboard/settings", labelKey: "settings" },
      { href: "/dashboard/subscription", labelKey: "subscription" },
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
}: {
  storeName?: string;
  locale: Locale;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const t = createTranslator(locale);

  useEffect(() => {
    setPendingHref(null);
  }, [pathname]);

  return (
    <>
      <div className="mb-3 flex items-center justify-between lg:hidden">
        <p className="text-sm font-medium text-slate-600">
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
          "space-y-5 rounded-2xl bg-white p-3 ring-1 ring-slate-200 lg:block",
          open ? "block" : "hidden",
        )}
      >
        {storeName ? (
          <div className="hidden rounded-xl bg-slate-50 px-3 py-2 lg:block">
            <p className="text-xs uppercase tracking-wide text-slate-500">
              {t("activeStore")}
            </p>
            <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">
              {storeName}
            </p>
          </div>
        ) : null}

        {groups.map((group) => (
          <div key={group.titleKey}>
            <p className="px-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              {t(group.titleKey)}
            </p>
            <ul className="mt-1 space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                const loading = pendingHref === item.href && !active;
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
                        "flex items-center justify-between gap-2 rounded-xl px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-50",
                        loading && "bg-teal-50 text-teal-900 ring-1 ring-teal-200",
                      )}
                      aria-current={active ? "page" : undefined}
                      aria-busy={loading || undefined}
                    >
                      <span>{t(item.labelKey)}</span>
                      {loading ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
