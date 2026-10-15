import { LOGO_SIZE_OPTIONS, THEME_TOKEN_KEYS } from "@/config/themes";
import { isAllowedImageUrl } from "@/lib/http-url";
import { isReservedStoreSlug } from "@/lib/reserved-slugs";
import {
  isColorOptionName,
  parseOptionValueInput,
} from "@/lib/option-colors";
import { z } from "zod";
import {
  INTERNATIONAL_PHONE_MESSAGE,
  internationalPhoneError,
} from "@/lib/phone";

const moneySchema = z.number().finite().nonnegative();

const imageUrlSchema = z
  .string()
  .trim()
  .refine(isAllowedImageUrl, "رابط الصورة غير صالح.");

const HEX_COLOR = /^#[0-9A-Fa-f]{6}$/;
const LOGO_SIZES = new Set<string>(LOGO_SIZE_OPTIONS.map((option) => option.value));
const THEME_COLOR_KEYS = new Set<string>([
  ...THEME_TOKEN_KEYS,
  "qrStandColor",
  "qrLogoBg",
]);

export const emailSchema = z
  .string()
  .email("أدخل بريدًا إلكترونيًا صالحًا.");

export const passwordSchema = z
  .string()
  .min(8, "يجب أن تكون كلمة المرور 8 أحرف على الأقل.")
  .max(72, "كلمة المرور طويلة جدًا.");

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
  fullName: z.string().trim().min(1, "الاسم مطلوب.").max(120).optional(),
});

export const signInSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "كلمة المرور مطلوبة."),
});

export const updateProfileSchema = z.object({
  fullName: z.string().trim().min(1, "الاسم مطلوب.").max(120),
});

export const updatePasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "أكّد كلمة المرور."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "كلمتا المرور غير متطابقتين.",
    path: ["confirmPassword"],
  });

const internationalPhoneSchema = z
  .string()
  .trim()
  .max(16, "رقم الهاتف طويل جدًا.")
  .refine((value) => internationalPhoneError(value) === null, {
    message: INTERNATIONAL_PHONE_MESSAGE,
  });

export const createStoreSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: slugSchema.refine(
    (slug) => !isReservedStoreSlug(slug),
    "رابط المتجر محجوز. اختر اسمًا آخر.",
  ),
  description: z.string().trim().max(1000).optional(),
  currency: z.enum(["USD", "EUR", "SYP", "TRY"]),
  whatsapp: internationalPhoneSchema.optional(),
  defaultLocale: z.enum(["ar"]).optional(),
});

export const updateStoreSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  logoUrl: imageUrlSchema.nullable().optional(),
  coverUrl: imageUrlSchema.nullable().optional(),
  phone: internationalPhoneSchema.nullable().optional(),
  whatsapp: internationalPhoneSchema.nullable().optional(),
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
    .record(z.string(), z.string().min(1).max(120))
    .nullable()
    .optional()
    .transform((value) => {
      if (!value) return value;
      return Object.fromEntries(
        Object.entries(value).filter(([key, raw]) => {
          if (key === "navbarActions") return /^[a-z,]+$/.test(raw);
          if (key === "logoSize") return LOGO_SIZES.has(raw);
          if (key === "radius") return /^\d+(\.\d+)?(rem|px)$/.test(raw);
          if (THEME_COLOR_KEYS.has(key)) return HEX_COLOR.test(raw);
          return false;
        }),
      );
    }),
  currency: z.enum(["USD", "EUR", "SYP", "TRY"]).optional(),
  defaultLocale: z.enum(["ar"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: slugSchema.optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
  icon: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]+:[a-z0-9-]+$/i, "Invalid icon id")
    .max(80)
    .nullable()
    .optional(),
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
    .max(32)
    .optional(),
});

/** Minimum word count merchants must meet for product descriptions. */
export const MIN_PRODUCT_DESCRIPTION_WORDS = 10;

export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

export const productSchema = z.object({
  name: z.string().trim().min(1).max(160),
  slug: slugSchema.optional(),
  description: z
    .string()
    .trim()
    .refine(
      (value) => countWords(value) >= MIN_PRODUCT_DESCRIPTION_WORDS,
      `الوصف قصير جدًا. اكتب على الأقل ${MIN_PRODUCT_DESCRIPTION_WORDS} كلمات.`,
    )
    .max(10000),
  price: moneySchema,
  compareAtPrice: moneySchema.nullable().optional(),
  stock: z.number().int().nonnegative().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  status: z.enum(["draft", "published", "archived", "hidden"]).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  specifications: z
    .record(z.string().trim().min(1).max(80), z.string().trim().max(500))
    .refine((value) => Object.keys(value).length <= 40, "عدد المواصفات كبير جدًا.")
    .optional(),
  featured: z.boolean().optional(),
  clientRequestId: z
    .string()
    .trim()
    .min(8)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/)
    .optional(),
  images: z
    .array(
      z.object({
        url: imageUrlSchema,
        alt: z.string().max(200).nullable().optional(),
        sortOrder: z.number().int().nonnegative(),
      }),
    )
    .min(1, "Add at least one product image.")
    .max(10)
    .optional(),
  variants: z
    .array(
      z.object({
        name: z.string().min(1).max(80),
        options: z.record(z.string(), z.string()),
        price: moneySchema.nullable().optional(),
        stock: z.number().int().nonnegative().nullable().optional(),
        sku: z.string().max(64).nullable().optional(),
      }),
    )
    .max(50)
    .optional(),
});

function boundAnalyticsMetadata(
  value: unknown,
): Record<string, string | number | boolean | null> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Record<string, string | number | boolean | null> = {};
  for (const [key, raw] of Object.entries(value)) {
    if (Object.keys(out).length >= 20) break;
    const safeKey = key.trim().slice(0, 40);
    if (!safeKey) continue;
    if (typeof raw === "string") out[safeKey] = raw.slice(0, 200);
    else if (typeof raw === "number" && Number.isFinite(raw)) out[safeKey] = raw;
    else if (typeof raw === "boolean" || raw === null) out[safeKey] = raw;
  }
  return out;
}

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
  metadata: z.unknown().optional().transform(boundAnalyticsMetadata),
});

export const supportMessageSchema = z.object({
  body: z.string().trim().min(2).max(2000),
  storeId: z.string().uuid().nullable().optional(),
});
