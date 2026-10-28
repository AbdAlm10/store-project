"use client";

import { LogOut } from "lucide-react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const SIGNUP_COPY = "عجبك؟ أنشئ متجرك الآن وجرّبه 10 أيام مجاناً";

type DemoContextValue = {
  enabled: boolean;
  openSignup: () => void;
};

const DemoContext = createContext<DemoContextValue>({
  enabled: false,
  openSignup: () => {},
});

export function useDemoMode() {
  const demo = useContext(DemoContext);
  return {
    enabled: demo.enabled,
    block(): boolean {
      if (!demo.enabled) return false;
      demo.openSignup();
      return true;
    },
  };
}

export function DemoModeProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const openSignup = useCallback(() => setOpen(true), []);
  const value = useMemo(() => ({ enabled: true, openSignup }), [openSignup]);

  return (
    <DemoContext.Provider value={value}>
      {children}
      {open ? <DemoSignupModal onClose={() => setOpen(false)} /> : null}
    </DemoContext.Provider>
  );
}

function DemoSignupModal({ onClose }: { onClose: () => void }) {
  if (typeof document === "undefined") return null;
  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/40 p-4 sm:items-center"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-signup-title"
        className="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <p id="demo-signup-title" className="text-lg font-semibold leading-relaxed text-slate-900">
          {SIGNUP_COPY}
        </p>
        <Link
          href="/register"
          className="mt-5 inline-flex h-11 items-center justify-center rounded-full bg-brand-600 px-6 text-sm font-semibold text-white"
        >
          أنشئ متجرك
        </Link>
        <button type="button" onClick={onClose} className="mt-3 block w-full text-sm text-slate-500">
          إغلاق
        </button>
      </div>
    </div>,
    document.body,
  );
}

export function DemoBanner() {
  return (
    <Link
      href="/register"
      className="flex h-11 shrink-0 items-center justify-center bg-brand-700 px-3 text-center text-xs font-semibold text-white sm:text-sm"
    >
      هي نسخة تجريبية — أنشئ متجرك الحقيقي الآن
    </Link>
  );
}

export function DemoSignupButton({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const demo = useDemoMode();
  return (
    <button type="button" className={className} onClick={() => demo.block()}>
      {children}
    </button>
  );
}

export function DemoSignOutButton({ label }: { label: string }) {
  const demo = useDemoMode();
  return (
    <button
      type="button"
      onClick={() => demo.block()}
      className="flex w-full min-w-0 items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
    >
      <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
      <span className="truncate">{label}</span>
    </button>
  );
}
