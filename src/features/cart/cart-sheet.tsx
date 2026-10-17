"use client";

import { placeStoreOrder, type PlaceOrderResult } from "@/features/cart/actions";
import { useCart, visitorKey, type CartLine } from "@/features/cart/cart-context";
import { useI18n } from "@/i18n/provider";
import { PAYMENT_METHODS, SYRIAN_GOVERNORATES, paymentLabel } from "@/lib/orders/checkout";
import {
  buildCartWhatsAppMessage,
  formatOrderAmount,
  storeUrl,
  whatsAppHref,
  type CartOrderLine,
} from "@/lib/social/sharing";
import { cn } from "@/lib/utils/cn";
import { SafeImage } from "@/components/ui/safe-image";
import { Minus, Plus, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Step = "cart" | "details" | "sent";

function lineTotal(line: CartLine): number {
  return line.unitPrice * line.quantity;
}

export function CartSheet() {
  const cart = useCart();
  const router = useRouter();
  const { t } = useI18n();
  const [step, setStep] = useState<Step>("cart");
  const [fieldError, setFieldError] = useState<"name" | "governorate" | null>(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [waUrl, setWaUrl] = useState<string | null>(null);
  const [leftPage, setLeftPage] = useState(false);

  useEffect(() => {
    if (!cart.open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") cart.setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cart]);

  useEffect(() => {
    if (step !== "sent") return;
    function onVisibility() {
      if (document.visibilityState === "hidden") setLeftPage(true);
      if (document.visibilityState === "visible" && leftPage) {
        cart.clear();
        cart.setOpen(false);
        setStep("cart");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [cart, leftPage, step]);

  if (!cart.open) return null;

  function close() {
    cart.setOpen(false);
  }

  function backToStore() {
    cart.clear();
    cart.setOpen(false);
    setStep("cart");
    router.push(`/${cart.store.slug}`);
  }

  function openWhatsApp(url: string) {
    window.open(url, "_blank", "noopener,noreferrer");
  }

  async function sendOrder() {
    if (cart.customer.name.trim().length < 2) {
      setFieldError("name");
      return;
    }
    if (!SYRIAN_GOVERNORATES.includes(cart.customer.governorate as (typeof SYRIAN_GOVERNORATES)[number])) {
      setFieldError("governorate");
      return;
    }
    if (cart.lines.length === 0) return;
    setFieldError(null);
    const popup = window.open("", "_blank");
    setPending(true);
    const currency = cart.lines[0]?.currency ?? "SYP";
    const localLines: CartOrderLine[] = cart.lines
      .filter((line) => line.currency === currency)
      .map((line) => ({
        name: line.name,
        options: line.options,
        quantity: line.quantity,
        lineTotal: lineTotal(line),
      }));
    const localTotal = localLines.reduce((sum, line) => sum + line.lineTotal, 0);
    let result: PlaceOrderResult = { ok: false, reason: "unavailable" };
    try {
      result = await placeStoreOrder({
        storeId: cart.store.id,
        visitorKey: visitorKey(),
        items: cart.lines.map((line) => ({
          productId: line.productId,
          name: line.name,
          quantity: line.quantity,
          options: line.options,
          clientUnitPrice: line.unitPrice,
        })),
        customer: {
          name: cart.customer.name.trim(),
          governorate: cart.customer.governorate as (typeof SYRIAN_GOVERNORATES)[number],
          address: cart.customer.address.trim(),
          notes: cart.customer.notes.trim(),
          payment: cart.customer.payment,
        },
      });
    } catch {
      result = { ok: false, reason: "unavailable" };
    }
    setPending(false);

    const recorded = result.ok ? result : null;
    const lines = recorded && recorded.items.length > 0
      ? recorded.items.map((item) => ({
          name: item.name,
          options: item.options,
          quantity: item.quantity,
          lineTotal: item.lineTotal,
        }))
      : localLines;
    const total = recorded && recorded.items.length > 0 ? recorded.total : localTotal;
    const messageCurrency = recorded?.currency || currency;
    const code = recorded?.code ?? null;
    const message = buildCartWhatsAppMessage({
      storeName: cart.store.name,
      storeLink: storeUrl(cart.store.slug),
      orderCode: code,
      currency: messageCurrency,
      lines,
      total,
      customerName: cart.customer.name,
      governorate: cart.customer.governorate,
      address: cart.customer.address,
      notes: cart.customer.notes,
      paymentLabel: paymentLabel(cart.customer.payment),
    });
    const href = cart.store.whatsapp ? whatsAppHref(cart.store.whatsapp, message) : null;
    const notes = [
      recorded && recorded.priceChanges.length > 0 ? t("cartPriceChanged") : null,
      recorded && recorded.removed.length > 0 ? t("cartRemoved") : null,
    ].filter(Boolean);
    setNotice(notes.length ? notes.join(" ") : null);
    setOrderCode(code);
    setWaUrl(href);
    setLeftPage(false);
    setStep("sent");
    if (href) {
      if (popup && !popup.closed) popup.location.href = href;
      else window.location.href = href;
    } else if (popup && !popup.closed) {
      popup.close();
    }
  }

  return (
    <div className="fixed inset-0 z-[80]" role="presentation">
      <button
        type="button"
        aria-label={t("cartClose")}
        className="absolute inset-0 bg-black/40"
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("cartTitle")}
        dir="rtl"
        className="animate-cart-sheet absolute z-[81] flex flex-col bg-[#f7f4ef] text-[#1c241e] shadow-2xl max-md:inset-x-0 max-md:bottom-0 max-md:h-[85dvh] max-md:rounded-t-[1.75rem] md:inset-y-0 md:end-0 md:h-full md:w-[400px]"
        style={{ fontFamily: "var(--font-arabic), var(--font-body), sans-serif" }}
      >
        <div className="flex items-center justify-between px-4 pt-4">
          <h2 className="text-lg font-bold">{t("cartTitle")}</h2>
          <button
            type="button"
            onClick={close}
            aria-label={t("cartClose")}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {step === "cart" ? (
          <CartStep
            onContinue={() => {
              if (cart.lines.length === 0) return;
              setStep("details");
            }}
          />
        ) : null}
        {step === "details" ? (
          <DetailsStep
            fieldError={fieldError}
            pending={pending}
            onBack={() => setStep("cart")}
            onField={() => setFieldError(null)}
            onSend={() => void sendOrder()}
          />
        ) : null}
        {step === "sent" ? (
          <SentStep
            code={orderCode}
            notice={notice}
            onResend={() => {
              if (waUrl) openWhatsApp(waUrl);
            }}
            onBack={backToStore}
          />
        ) : null}
      </div>
    </div>
  );
}

function CartStep({ onContinue }: { onContinue: () => void }) {
  const cart = useCart();
  const { t } = useI18n();
  const totals = new Map<string, number>();
  for (const line of cart.lines) {
    totals.set(line.currency, (totals.get(line.currency) ?? 0) + lineTotal(line));
  }

  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {cart.lines.length === 0 ? (
          <div className="space-y-4">
            <p className="text-base font-semibold">{t("cartEmpty")}</p>
            <div className="space-y-2">
              {cart.popular.map((product) => (
                <Link
                  key={product.id}
                  href={`/${cart.store.slug}/products/${product.slug}`}
                  onClick={() => cart.setOpen(false)}
                  className="flex items-center gap-3 rounded-2xl bg-white p-2"
                >
                  <ProductThumb src={product.imageUrl} name={product.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold">{product.name}</span>
                    <span className="text-sm text-[#3f8560]">
                      {formatOrderAmount(product.price, product.currency)}
                    </span>
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ) : (
          <ul className="space-y-3">
            {cart.lines.map((line) => (
              <li key={line.key} className="flex items-center gap-3">
                <ProductThumb src={line.imageUrl} name={line.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{line.name}</p>
                  {Object.keys(line.options).length > 0 ? (
                    <p className="truncate text-xs text-[#5d665f]">
                      {Object.entries(line.options)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                    </p>
                  ) : null}
                  <div className="mt-1 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={t("cartDecrease")}
                      onClick={() => cart.setQuantity(line.key, line.quantity - 1)}
                      className="inline-flex h-11 w-8 items-center justify-center"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={t("cartIncrease")}
                      onClick={() => cart.setQuantity(line.key, line.quantity + 1)}
                      className="inline-flex h-11 w-8 items-center justify-center"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className="text-sm font-bold tabular-nums">
                    {formatOrderAmount(lineTotal(line), line.currency)}
                  </span>
                  <button
                    type="button"
                    aria-label={t("cartDelete")}
                    onClick={() => cart.removeLine(line.key)}
                    className="inline-flex h-11 w-11 items-center justify-center text-[#8a4b4b]"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {cart.lines.length > 0 ? (
        <div className="space-y-3 border-t border-[#e3d2ad] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="text-2xl font-bold tabular-nums">
            {[...totals.entries()]
              .map(([currency, total]) => formatOrderAmount(total, currency))
              .join(" · ")}
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="h-12 w-full rounded-full bg-brand-600 text-base font-bold text-white"
          >
            {t("cartContinue")}
          </button>
        </div>
      ) : null}
    </>
  );
}

function ProductThumb({ src, name }: { src: string | null; name: string }) {
  return src ? (
    <SafeImage
      src={src}
      alt=""
      width={56}
      height={56}
      className="h-14 w-14 shrink-0 rounded-xl object-cover"
    />
  ) : (
    <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white text-xs text-[#5d665f]">
      {name.slice(0, 1)}
    </span>
  );
}

function DetailsStep({
  fieldError,
  pending,
  onBack,
  onField,
  onSend,
}: {
  fieldError: "name" | "governorate" | null;
  pending: boolean;
  onBack: () => void;
  onField: () => void;
  onSend: () => void;
}) {
  const cart = useCart();
  const { t } = useI18n();
  return (
    <>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3">
        <Field label={t("cartName")} invalid={fieldError === "name"}>
          <input
            value={cart.customer.name}
            onChange={(event) => {
              onField();
              cart.setCustomer({ name: event.target.value });
            }}
            className={fieldClass(fieldError === "name")}
            autoComplete="name"
          />
        </Field>
        <Field label={t("cartGovernorate")} invalid={fieldError === "governorate"}>
          <select
            value={cart.customer.governorate}
            onChange={(event) => {
              onField();
              cart.setCustomer({ governorate: event.target.value });
            }}
            className={fieldClass(fieldError === "governorate")}
          >
            <option value="">{t("cartChooseGovernorate")}</option>
            {SYRIAN_GOVERNORATES.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("cartAddress")}>
          <input
            value={cart.customer.address}
            onChange={(event) => cart.setCustomer({ address: event.target.value })}
            className={fieldClass(false)}
            autoComplete="street-address"
          />
        </Field>
        <Field label={t("cartNotes")}>
          <textarea
            value={cart.customer.notes}
            onChange={(event) => cart.setCustomer({ notes: event.target.value })}
            className={cn(fieldClass(false), "h-24 py-3")}
          />
        </Field>
        <div className="space-y-2">
          <p className="text-sm font-semibold">{t("cartPayment")}</p>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => {
              const selected = cart.customer.payment === method.id;
              return (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => cart.setCustomer({ payment: method.id })}
                  className={cn(
                    "h-12 rounded-full px-4 text-sm font-bold",
                    selected ? "bg-brand-600 text-white" : "border border-[#e3d2ad] bg-white",
                  )}
                >
                  {method.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <div className="space-y-2 border-t border-[#e3d2ad] px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={onSend}
          disabled={pending}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-brand-600 text-base font-bold text-white disabled:opacity-70"
        >
          <Send className="h-4 w-4" />
          {t("cartSend")}
        </button>
        <p className="text-center text-xs leading-relaxed text-[#5d665f]">{t("cartSendHint")}</p>
        <button type="button" onClick={onBack} className="h-11 w-full text-sm font-semibold text-[#3f8560]">
          {t("cartTitle")}
        </button>
      </div>
    </>
  );
}

function SentStep({
  code,
  notice,
  onResend,
  onBack,
}: {
  code: string | null;
  notice: string | null;
  onResend: () => void;
  onBack: () => void;
}) {
  const cart = useCart();
  const { t } = useI18n();
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-between px-4 py-6 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="space-y-3">
        <p className="text-2xl font-bold">{t("cartSent")}</p>
        {code ? <p className="text-lg font-bold text-[#3f8560]">#{code}</p> : null}
        {notice ? <p className="text-sm leading-relaxed text-[#8a4b4b]">{notice}</p> : null}
      </div>
      <div className="space-y-3">
        <button
          type="button"
          onClick={onBack}
          className="h-12 w-full rounded-full bg-brand-600 text-base font-bold text-white"
        >
          {t("cartBackToStore")}
        </button>
        <button type="button" onClick={onResend} className="h-12 w-full rounded-full border border-[#3f8560] text-sm font-bold text-[#3f8560]">
          {t("cartResend")}
        </button>
        {cart.store.showPromo ? (
          <Link href="/" className="block text-center text-xs font-semibold text-[#5d665f] underline-offset-2 hover:underline">
            {t("cartPromo")}
          </Link>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  invalid,
  children,
}: {
  label: string;
  invalid?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${invalid ? "animate-cart-shake" : ""}`}>
      <span className="text-sm font-semibold">{label}</span>
      {children}
    </label>
  );
}

function fieldClass(invalid: boolean): string {
  return cn(
    "h-12 w-full rounded-2xl border bg-white px-3 text-base outline-none",
    invalid ? "border-[#f0b4b4]" : "border-[#e3d2ad]",
  );
}
