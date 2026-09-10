import { z } from "zod";
import {
  isColorOptionName,
  parseOptionValueInput,
} from "@/lib/option-colors";

export const emailSchema = z
  .string()
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(72, "Password is too long.");

export const slugSchema = z
  .string()
  .min(2, "Store URL must be at least 2 characters.")
  .max(60, "Store URL is too long.")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Store URL: use only lowercase letters, numbers, and hyphens (e.g. alnoor). No @ or email.",
  );

export const signUpSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().trim().min(1).max(120).optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

const RESERVED_STORE_SLUGS = new Set([
  "admin",
  "api",
  "dashboard",
  "login",
  "register",
  "onboarding",
  "settings",
  "subscription",
  "explore",
  "app",
  "www",
  "static",
  "assets",
]);

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.refine(
    (slug) => !RESERVED_STORE_SLUGS.has(slug),
    "This store URL is reserved. Choose another.",
  ),
  description: z.string().trim().max(1000).optional(),
  currency: z.enum(["USD", "EUR", "TRY", "SYP", "SAR", "AED", "GBP"]),
  whatsapp: z.string().trim().max(32).optional(),
  defaultLocale: z.enum(["ar"]).optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  phone: z.string().trim().max(32).nullable().optional(),
  whatsapp: z.string().trim().max(32).nullable().optional(),
  email: z.string().email().nullable().optional(),
  location: z.string().trim().max(200).nullable().optional(),
  openingHours: z.string().trim().max(500).nullable().optional(),
  instagram: z.string().trim().max(120).nullable().optional(),
  facebook: z.string().trim().max(200).nullable().optional(),
  telegram: z.string().trim().max(120).nullable().optional(),
  tiktok: z.string().trim().max(120).nullable().optional(),
  primaryColor: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional(),
  themeId: z
    .enum(["clean", "bold", "warm", "minimal", "classic", "ocean", "night", "rose"])
    .optional(),
  themeOverrides: z
    .record(z.string(), z.string().min(1).max(64))
    .nullable()
    .optional()
    .transform((value) => {
      if (!value) return value;
      const allowed = new Set([
        "background",
        "surface",
        "card",
        "text",
        "muted",
        "border",
        "accent",
        "headerFrom",
        "headerTo",
        "navBg",
        "buttonText",
        "radius",
        "fontDisplay",
        "fontBody",
      ]);
      return Object.fromEntries(
        Object.entries(value).filter(([key]) => allowed.has(key)),
      );
    }),
  currency: z.enum(["USD", "EUR", "TRY", "SYP", "SAR", "AED", "GBP"]).optional(),
  defaultLocale: z.enum(["ar"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  optionSchema: z
    .array(
      z.preprocess(
        (raw) => {
          if (!raw || typeof raw !== "object") return raw;
          const row = raw as Record<string, unknown>;
          const name = String(row.name ?? "").trim();
          const valuesRaw = Array.isArray(row.values) ? row.values : [];
          const values = valuesRaw.map((item) => {
            if (typeof item === "string") {
              const parsed = parseOptionValueInput(item);
              return { label: parsed.label, hex: parsed.hex ?? null };
            }
            if (item && typeof item === "object") {
              const value = item as Record<string, unknown>;
              const label = String(value.label ?? "").trim();
              const hexRaw =
                value.hex == null || value.hex === ""
                  ? null
                  : String(value.hex).trim();
              return {
                label,
                hex: hexRaw && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hexRaw)
                  ? hexRaw
                  : null,
              };
            }
            return { label: "", hex: null };
          });
          const kind =
            row.kind === "color" || row.kind === "text"
              ? row.kind
              : isColorOptionName(name)
                ? "color"
                : "text";
          return {
            id: String(row.id ?? "").trim() || `opt-${name || "custom"}`,
            name,
            kind,
            values,
          };
        },
        z.object({
          id: z.string().min(1),
          name: z.string().trim().min(1).max(40),
          kind: z.enum(["color", "text"]),
          values: z
            .array(
              z.object({
                label: z.string().trim().min(1).max(40),
                hex: z
                  .string()
                  .regex(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/)
                  .nullable(),
              }),
            )
            .max(30),
        }),
      ),
    )
    .max(8)
    .optional(),
});

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: slugSchema.optional(),
  description: z.string().trim().max(10000).nullable().optional(),
  price: z.number().nonnegative(),
  compareAtPrice: z.number().nonnegative().nullable().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "archived", "hidden"]).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  specifications: z.record(z.string(), z.string()).optional(),
  featured: z.boolean().optional(),
  images: z
    .array(
      z.object({
        url: z.string().url(),
        alt: z.string().max(200).nullable().optional(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .max(16)
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        options: z.record(z.string(), z.string()),
        price: z.number().nonnegative().nullable().optional(),
        stock: z.number().int().nonnegative().nullable().optional(),
        sku: z.string().max(64).nullable().optional(),
      }),
    )
    .max(50)
    .optional(),
});

export const analyticsTrackSchema = z.object({
  storeId: z.string().uuid(),
  productId: z.string().uuid().nullable().optional(),
  eventType: z.enum([
    "store_view",
    "product_view",
    "whatsapp_click",
    "share",
    "search",
    "qr_scan",
  ]),
  source: z.string().max(120).nullable().optional(),
  path: z.string().max(500).nullable().optional(),
  visitorKey: z.string().max(80).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
