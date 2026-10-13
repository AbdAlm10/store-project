import { afterEach, describe, expect, it, vi } from "vitest";
import { publicSupportWhatsAppUrl } from "@/lib/support-contact";

describe("public support WhatsApp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("hides the link when the number is empty", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_WHATSAPP", "");
    expect(publicSupportWhatsAppUrl()).toBeNull();
  });

  it("builds a wa.me link from digits and symbols", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPPORT_WHATSAPP", "+963 944 000 000");
    expect(publicSupportWhatsAppUrl()).toBe("https://wa.me/963944000000");
  });
});
