"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

export type MarketingNavLink = {
  href: string;
  label: string;
};

export function MarketingNav({
  links,
  signInHref,
  signInLabel,
  createHref,
  createLabel,
  openMenuLabel,
  closeMenuLabel,
}: {
  links: MarketingNavLink[];
  signInHref: string;
  signInLabel: string;
  createHref: string;
  createLabel: string;
  openMenuLabel: string;
  closeMenuLabel: string;
}) {
  const pathname = usePathname();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visibleHash, setVisibleHash] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (pathname !== "/") return;
    const sections = links
      .map((link) => {
        const hash = link.href.startsWith("/#") ? link.href.slice(2) : "";
        return hash ? document.getElementById(hash) : null;
      })
      .filter((node): node is HTMLElement => Boolean(node));
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setVisibleHash(`/#${visible.target.id}`);
      },
      { rootMargin: "-28% 0px -55% 0px", threshold: [0.15, 0.35, 0.6] },
    );
    for (const section of sections) observer.observe(section);
    return () => observer.disconnect();
  }, [links, pathname]);

  function isCurrent(href: string): boolean {
    if (href.startsWith("/#")) return pathname === "/" && visibleHash === href;
    return pathname === href;
  }

  return (
    <>
      <nav
        className="hidden min-w-0 flex-1 items-center justify-center gap-1 md:flex"
        aria-label="التنقل"
      >
        {links.map((item) => {
          const current = isCurrent(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={current ? "true" : undefined}
              className={cn(
                "relative inline-flex min-h-11 items-center rounded-full px-3 text-sm font-medium transition",
                current
                  ? "text-brand-700"
                  : "text-slate-600 hover:bg-white/60 hover:text-slate-900",
              )}
            >
              {item.label}
              {current ? (
                <span className="absolute inset-x-3 bottom-1.5 h-0.5 rounded-full bg-brand-600" />
              ) : null}
            </Link>
          );
        })}
      </nav>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <Link
          href={signInHref}
          className="hidden min-h-11 items-center rounded-full px-3 text-sm font-medium text-slate-600 transition hover:text-slate-900 sm:inline-flex"
        >
          {signInLabel}
        </Link>
        <Link
          href={createHref}
          className={cn(
            buttonVariants({ size: "sm" }),
            "h-11 min-h-11 rounded-full px-4",
          )}
        >
          {createLabel}
        </Link>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-white/70 md:hidden"
          aria-expanded={open}
          aria-controls={menuId}
          aria-label={open ? closeMenuLabel : openMenuLabel}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? (
            <X className="h-5 w-5" aria-hidden />
          ) : (
            <Menu className="h-5 w-5" aria-hidden />
          )}
        </button>
      </div>

      {open && mounted
        ? createPortal(
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label={closeMenuLabel}
            onClick={() => setOpen(false)}
          />
          <nav
            id={menuId}
            aria-label="القائمة"
            className="absolute inset-y-0 start-0 flex w-[min(100%,20rem)] flex-col gap-1 overflow-y-auto bg-white p-5 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.45)]"
          >
            <div className="mb-2 flex items-center justify-between px-3">
              <p className="text-sm font-semibold text-[var(--muted)]">دكّان</p>
              <button
                type="button"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full text-slate-700 hover:bg-slate-100"
                aria-label={closeMenuLabel}
                onClick={() => setOpen(false)}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            {links.map((item) => {
              const current = isCurrent(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={current ? "true" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center rounded-2xl px-3 text-base font-medium",
                    current
                      ? "bg-brand-50 text-brand-800"
                      : "text-slate-800 hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href={signInHref}
              onClick={() => setOpen(false)}
              className="flex min-h-11 items-center rounded-2xl px-3 text-base font-medium text-slate-800 hover:bg-slate-50"
            >
              {signInLabel}
            </Link>
            <Link
              href={createHref}
              onClick={() => setOpen(false)}
              className={cn(
                buttonVariants({ size: "md" }),
                "mt-3 h-11 min-h-11 w-full rounded-full",
              )}
            >
              {createLabel}
            </Link>
          </nav>
        </div>,
          document.body,
        )
        : null}
    </>
  );
}
