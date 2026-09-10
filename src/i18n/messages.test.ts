import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE, dirFor, isLocale, isRtl } from "@/i18n/config";
import { t } from "@/i18n/messages";

describe("i18n", () => {
  it("is Arabic-only", () => {
    expect(DEFAULT_LOCALE).toBe("ar");
    expect(isLocale("ar")).toBe(true);
    expect(isLocale("en")).toBe(false);
    expect(isLocale("tr")).toBe(false);
  });

  it("marks Arabic as RTL", () => {
    expect(isRtl("ar")).toBe(true);
    expect(dirFor("ar")).toBe("rtl");
  });

  it("translates core storefront keys in Arabic", () => {
    expect(t("ar", "orderWhatsApp")).toContain("واتساب");
    expect(t("ar", "tagline")).toContain("رابط");
  });
});
