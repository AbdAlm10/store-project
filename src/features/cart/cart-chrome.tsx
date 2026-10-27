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

/**
 * The free-plan badge is an iframe (#nl-badge-frame) fixed to the bottom-right,
 * about 92px tall. netlify.toml cannot remove it. Measure it so the bar sits
 * above the iframe, and drop the extra gap when the badge is off.
 */
function useNetlifyBadgeClearance(): number {
  const [extra, setExtra] = useState(0);

  useEffect(() => {
    function measure() {
      const frame = document.getElementById("nl-badge-frame");
      if (!(frame instanceof HTMLElement)) {
        setExtra(0);
        return;
      }
      const rect = frame.getBoundingClientRect();
      setExtra(rect.height > 8 ? Math.ceil(rect.height) : 0);
    }

    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true });
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  return extra;
}

function cartBottomOffset(badgeClearance: number): string {
  return `calc(env(safe-area-inset-bottom, 0px) + 0.75rem + ${badgeClearance}px)`;
}

export function CartSpacer() {
  const cart = useCart();
  const badgeClearance = useNetlifyBadgeClearance();
  if (cart.count === 0 || cart.open) return null;
  return (
    <div
      className="md:hidden"
      style={{
        height: `calc(${cartBottomOffset(badgeClearance)} + 4.25rem)`,
      }}
      aria-hidden
    />
  );
}

export function CartBottomBar() {
  const cart = useCart();
  const { t } = useI18n();
  const badgeClearance = useNetlifyBadgeClearance();
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
    <div
      className="pointer-events-none fixed inset-x-0 z-40 px-3 md:hidden"
      style={{ bottom: cartBottomOffset(badgeClearance) }}
    >
      <button
        type="button"
        onClick={() => cart.setOpen(true)}
        className="pointer-events-auto flex w-full items-center gap-3 rounded-full bg-brand-600 px-4 py-2.5 text-white shadow-[0_12px_30px_-16px_rgba(63,133,96,0.9)]"
      >
        <span className="min-w-0 flex-1 text-start">
          <span className="block truncate text-xs font-semibold opacity-90">
            {t("cartTitle")} · {cart.count} {noun}
          </span>
          <span
            dir="ltr"
            className="mt-0.5 block whitespace-nowrap text-end text-sm font-bold leading-none tabular-nums"
          >
            {totalLabel}
          </span>
        </span>
        <span className="shrink-0 whitespace-nowrap text-sm font-bold">
          ← {t("cartCheckout")}
        </span>
      </button>
    </div>
  );
}
