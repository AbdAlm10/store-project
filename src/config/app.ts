import { normalizePublicAppOrigin } from "@/lib/app-origin";

export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "دكّان",
  nameLatin: "Dukkan",
  tagline: "كل منتجات متجرك في رابط واحد.",
  url: normalizePublicAppOrigin(process.env.NEXT_PUBLIC_APP_URL),  env: (process.env.APP_ENV ?? "development") as
    | "development"
    | "staging"
    | "production",
  supportEmail: "support@dukkan.app",
  /** Sales / billing WhatsApp (digits with country code, no +). */
  supportWhatsApp: "12363093269",
  brand: {
    green: "#58A379",
    greenDark: "#3A7A56",
    sand: "#E3D2AD",
    sandDark: "#C4A86E",
  },
} as const;
