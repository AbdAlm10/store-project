export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "دكّان",
  nameLatin: "Dukkan",
  tagline: "كل منتجات متجرك في رابط واحد.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  env: (process.env.APP_ENV ?? "development") as
    | "development"
    | "staging"
    | "production",
  supportEmail: "support@dukkan.app",
  demoStoreSlug: "alnoor",
  brand: {
    green: "#58A379",
    greenDark: "#3A7A56",
    sand: "#E3D2AD",
    sandDark: "#C4A86E",
  },
} as const;
