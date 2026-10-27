"use client";

import { useCart, useCartOptional } from "@/features/cart/cart-context";
import { useI18n } from "@/i18n/provider";
import { formatOrderAmount } from "@/lib/social/sharing";
import { ShoppingBag } from "lucide-react";
import { useEffect, useState } from "react";

export function CartHeaderButton() {
  const cart = useCartOptional();
  const { t } = useI18n();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!cart?.bump) return;
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 450);
    return () => window.clearTimeout(timer);
  }, [cart?.bump]);

  if (!cart) return null;

  return (
    <button
      type="button"
      onClick={() => cart.setOpen(true)}
      aria-label={t("cartTitle")}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full"
      style={{ color: "var(--store-nav-text, inherit)" }}
    >
      <ShoppingBag className="h-5 w-5" strokeWidth={2} />
      {cart.count > 0 ? (
        <span
          className={`absolute -top-0.5 end-0 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white ${pulse ? "animate-cart-bump" : ""}`}
        >
          {cart.count}
        </span>
      ) : null}
    </button>
  );
}

export function CartSpacer() {
  const cart = useCart();
  if (cart.count === 0 || cart.open) return null;
  return <div className="h-20 md:hidden" aria-hidden />;
}

export function CartBottomBar() {
  const cart = useCart();
  const { t } = useI18n();
  if (cart.count === 0 || cart.open) return null;

  const totals = new Map<string, number>();
  for (const line of cart.lines) {
    totals.set(line.currency, (totals.get(line.currency) ?? 0) + line.unitPrice * line.quantity);
  }
  const totalLabel = [...totals.entries()]
    .map(([currency, total]) => formatOrderAmount(total, currency))
    .join(" · ");
  const noun = cart.count === 1 ? "منتج" : cart.count === 2 ? "منتجان" : "منتجات";

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        className="pointer-events-auto flex h-12 w-full items-center justify-center rounded-full bg-brand-600 px-4 text-sm font-bold text-white shadow-[0_12px_30px_-16px_rgba(63,133,96,0.9)]"
      >
        <span className="min-w-0 truncate">
          {t("cartTitle")} · {cart.count} {noun} · {totalLabel} ← {t("cartCheckout")}
        </span>
      </button>
    </div>
  );
}
