import type { CategoryOptionDef } from "@/domain/types/entities";
import {
  isColorOptionName,
  normalizeOptionSchema,
  optionValueLabel,
  parseOptionValueInput,
} from "@/lib/option-colors";

export const OPTION_PRESETS: Array<{
  name: string;
  kind: "color" | "text";
  values: Array<{ label: string; hex?: string | null }>;
}> = [
  {
    name: "لون",
    kind: "color",
    values: [
      { label: "أسود", hex: "#111827" },
      { label: "أبيض", hex: "#F8FAFC" },
      { label: "أحمر", hex: "#DC2626" },
      { label: "أزرق", hex: "#2563EB" },
      { label: "أخضر", hex: "#16A34A" },
      { label: "بيج", hex: "#D6C3A8" },
    ],
  },
  {
    name: "مقاس",
    kind: "text",
    values: [
      { label: "XS" },
      { label: "S" },
      { label: "M" },
      { label: "L" },
      { label: "XL" },
      { label: "XXL" },
    ],
  },
  {
    name: "الخامة",
    kind: "text",
    values: [
      { label: "قطن" },
      { label: "جلد" },
      { label: "معدن" },
      { label: "خشب" },
      { label: "بلاستيك" },
    ],
  },
  {
    name: "السعة",
    kind: "text",
    values: [
      { label: "64GB" },
      { label: "128GB" },
      { label: "256GB" },
      { label: "512GB" },
      { label: "1TB" },
    ],
  },
  {
    name: "النمط",
    kind: "text",
    values: [
      { label: "كلاسيكي" },
      { label: "عصري" },
      { label: "رياضي" },
      { label: "كاجوال" },
    ],
  },
  {
    name: "الوزن",
    kind: "text",
    values: [
      { label: "خفيف" },
      { label: "متوسط" },
      { label: "ثقيل" },
    ],
  },
];

export function newOptionDef(
  name: string,
  values: Array<string | { label: string; hex?: string | null }> = [],
  kind?: "color" | "text",
): CategoryOptionDef {
  const resolvedKind = kind ?? (isColorOptionName(name) ? "color" : "text");
  return {
    id: crypto.randomUUID(),
    name,
    kind: resolvedKind,
    values: values.map((value) =>
      typeof value === "string" ? parseOptionValueInput(value) : value,
    ),
  };
}

/** Cartesian product of option values → variant rows. Caps at max. */
export function buildVariantMatrix(
  options: CategoryOptionDef[],
  max = 40,
): Array<{ name: string; options: Record<string, string> }> {
  const active = options.filter((opt) => opt.name.trim() && opt.values.length > 0);
  if (active.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const opt of active) {
    const next: Record<string, string>[] = [];
    for (const combo of combos) {
      for (const value of opt.values) {
        const label = optionValueLabel(value);
        next.push({ ...combo, [opt.name]: label });
        if (next.length >= max) break;
      }
      if (next.length >= max) break;
    }
    combos = next;
    if (combos.length >= max) break;
  }

  return combos.slice(0, max).map((opts) => ({
    name: Object.values(opts).join(" / "),
    options: opts,
  }));
}

/** Allowed labels per option name from the current category schema. */
export function schemaAllowedValues(
  options: CategoryOptionDef[],
): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  for (const opt of options) {
    const name = opt.name.trim();
    if (!name) continue;
    map.set(
      name,
      new Set(
        opt.values
          .map((value) => optionValueLabel(value).trim())
          .filter(Boolean),
      ),
    );
  }
  return map;
}

/** True when every option on the variant is still defined on the category schema. */
export function variantMatchesSchema(
  variantOptions: Record<string, string>,
  options: CategoryOptionDef[],
): boolean {
  if (!options.length) return true;
  const allowed = schemaAllowedValues(options);
  const entries = Object.entries(variantOptions);
  if (!entries.length) return false;
  for (const [key, value] of entries) {
    const set = allowed.get(key);
    if (!set || !set.has(value)) return false;
  }
  // Variant must cover all schema axes that have values
  for (const [name, set] of allowed) {
    if (set.size === 0) continue;
    if (!(name in variantOptions)) return false;
  }
  return true;
}

export function pruneVariantsToSchema<
  T extends { options: Record<string, string>; name?: string },
>(variants: T[], options: CategoryOptionDef[]): T[] {
  if (!options.length) return variants;
  return variants.filter((variant) =>
    variantMatchesSchema(variant.options, options),
  );
}

export { normalizeOptionSchema };
