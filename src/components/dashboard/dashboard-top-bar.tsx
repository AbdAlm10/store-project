"use client";

import { SafeImage } from "@/components/ui/safe-image";
import { logoutAction } from "@/features/auth/actions";
import { cn } from "@/lib/utils/cn";
import { ChevronDown, LogOut, Plus, Store } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

export function DashboardTopBar({
  storeName,
  storeSlug,
  storeLogoUrl,
  userName,
  userEmail,
  labels,
}: {
  storeName?: string;
  storeSlug?: string;
  storeLogoUrl?: string | null;
  userName: string;
  userEmail: string;
  labels: {
    addProduct: string;
    store: string;
    account: string;
    name: string;
    email: string;
    signOut: string;
  };
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
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
  }, [open]);

  const displayName = userName.trim() || storeName || labels.account;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <Link
        href="/dashboard/products/new"
        className="inline-flex h-10 items-center gap-1.5 rounded-full bg-brand-600 px-4 text-sm font-semibold text-white shadow-[0_8px_24px_-14px_rgba(58,122,86,0.55)] transition hover:bg-brand-700"
      >
        <Plus className="h-4 w-4" strokeWidth={2} />
        {labels.addProduct}
      </Link>

      {storeSlug ? (
        <Link
          href={`/${storeSlug}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-semibold text-slate-700 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.28)] transition hover:bg-slate-50 hover:text-slate-900"
        >
          <Store className="h-4 w-4 text-brand-700" strokeWidth={1.75} />
          {labels.store}
        </Link>
      ) : null}

      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((value) => !value)}
          className="inline-flex h-10 max-w-[16rem] items-center gap-2 rounded-full bg-white py-1 pe-3 ps-1 text-sm font-semibold text-slate-800 shadow-[0_8px_24px_-16px_rgba(15,23,42,0.28)] transition hover:bg-slate-50"
        >
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-50 text-brand-700">
            {storeLogoUrl ? (
              <SafeImage
                src={storeLogoUrl}
                alt={storeName ?? labels.store}
                fill
                className="object-cover"
                sizes="32px"
              />
            ) : (
              <Store className="h-4 w-4" strokeWidth={1.75} />
            )}
          </span>
          <span className="truncate">{displayName}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-slate-400 transition",
              open && "rotate-180",
            )}
            strokeWidth={1.75}
          />
        </button>

        {open ? (
          <div
            id={menuId}
            role="menu"
            className="absolute end-0 z-40 mt-2 w-72 overflow-hidden rounded-2xl border border-slate-100 bg-white p-2 shadow-[0_16px_40px_-20px_rgba(15,23,42,0.28)]"
          >
            <div className="rounded-xl bg-slate-50 px-3 py-3">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="text-xs text-slate-400">{labels.name}</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {userName.trim() || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-400">{labels.email}</dt>
                  <dd className="mt-0.5 break-all font-medium text-slate-900">
                    {userEmail}
                  </dd>
                </div>
              </dl>
            </div>

            <form action={logoutAction} className="mt-1">
              <button
                type="submit"
                role="menuitem"
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-red-50 hover:text-red-700"
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                {labels.signOut}
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </div>
  );
}
