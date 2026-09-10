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
    name: "Color",
    kind: "color",
    values: [
      { label: "Black", hex: "#111827" },
      { label: "White", hex: "#F8FAFC" },
      { label: "Red", hex: "#DC2626" },
      { label: "Blue", hex: "#2563EB" },
      { label: "Green", hex: "#16A34A" },
      { label: "Beige", hex: "#D6C3A8" },
    ],
  },
  {
    name: "Size",
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
    name: "Material",
    kind: "text",
    values: [
      { label: "Cotton" },
      { label: "Leather" },
      { label: "Metal" },
      { label: "Wood" },
      { label: "Plastic" },
    ],
  },
  {
    name: "Storage",
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
    name: "Style",
    kind: "text",
    values: [
      { label: "Classic" },
      { label: "Modern" },
      { label: "Sport" },
      { label: "Casual" },
    ],
  },
  {
    name: "Weight",
    kind: "text",
    values: [
      { label: "Light" },
      { label: "Medium" },
      { label: "Heavy" },
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

export { normalizeOptionSchema };
