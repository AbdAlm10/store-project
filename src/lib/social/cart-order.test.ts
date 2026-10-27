import { describe, expect, it } from "vitest";
import {
  buildCartWhatsAppMessage,
  formatOrderAmount,
  whatsAppHref,
} from "@/lib/social/sharing";

describe("cart WhatsApp message", () => {
  it("formats a numbered order with Latin digits and omits nothing that was filled", () => {
    const message = buildCartWhatsAppMessage({
      storeName: "متجر النور",
      storeLink: "https://dukkaan.netlify.app/alnoor",
      orderCode: "D-1042",
      currency: "SYP",
      lines: [
        {
          name: "قميص كتان رجالي أبيض",
          options: { المقاس: "42" },
          quantity: 2,
          lineTotal: 240000,
        },
        {
          name: "حذاء جلد",
          options: { اللون: "أسود" },
          quantity: 1,
          lineTotal: 350000,
        },
      ],
      total: 590000,
      customerName: "أحمد",
      governorate: "دمشق",
      address: "المزة",
      notes: "بعد العصر",
      paymentLabel: "كاش عند الاستلام",
    });

    expect(message).toBe(
      [
        "مرحباً متجر النور 👋",
        "طلب جديد رقم #D-1042",
        "",
        "1) قميص كتان رجالي أبيض",
        "   المقاس: 42 · الكمية: 2 · 240,000 ل.س",
        "2) حذاء جلد",
        "   اللون: أسود · الكمية: 1 · 350,000 ل.س",
        "",
        "المجموع: 590,000 ل.س",
        "",
        "الاسم: أحمد",
        "المحافظة: دمشق",
        "العنوان: المزة",
        "ملاحظات: بعد العصر",
        "الدفع: كاش عند الاستلام",
        "",
        "🛒 طلب من متجر النور — https://dukkaan.netlify.app/alnoor",
      ].join("\n"),
    );
    expect(message).not.toMatch(/[٠-٩]/);
  });

  it("drops empty address and notes and the order number when recording failed", () => {
    const message = buildCartWhatsAppMessage({
      storeName: "متجر النور",
      storeLink: "https://dukkaan.netlify.app/alnoor",
      orderCode: null,
      currency: "SYP",
      lines: [
        { name: "قميص", options: {}, quantity: 1, lineTotal: 1000 },
      ],
      total: 1000,
      customerName: "أحمد",
      governorate: "دمشق",
      address: "   ",
      notes: "",
      paymentLabel: "شام كاش",
    });
    expect(message.startsWith("مرحباً متجر النور 👋\nطلب جديد\n")).toBe(true);
    expect(message).not.toContain("رقم #");
    expect(message).not.toContain("العنوان:");
    expect(message).not.toContain("ملاحظات:");
    expect(message).toContain("الدفع: شام كاش");
  });

  it("builds a wa.me link from a formatted phone", () => {
    expect(formatOrderAmount(245000, "SYP")).toBe("245,000 ل.س");
    expect(whatsAppHref("+963 944 000 000", "مرحباً")).toBe(
      "https://wa.me/963944000000?text=" + encodeURIComponent("مرحباً"),
    );
  });
});
