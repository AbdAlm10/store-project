export const appConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "YourStore",
  tagline: "All your store products in one link.",
  url: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  env: (process.env.APP_ENV ?? "development") as
    | "development"
    | "staging"
    | "production",
  supportEmail: "support@yourstore.app",
  demoStoreSlug: "alnoor",
} as const;
