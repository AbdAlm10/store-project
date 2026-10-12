import type { Category, ProductWithMedia } from "@/domain/types/entities";
import {
  isColorOptionName,
  isSizeOptionName,
  resolveValueHex,
} from "@/lib/option-colors";

export type UsedColorFilter = { label: string; hex: string };
export type UsedPropertyGroup = { name: string; values: string[] };

/** Filter choices that at least one product variant actually uses. */
export function usedFilterValues(
  products: ProductWithMedia[],
  categories: Category[],
): {
  sizes: string[];
  colors: UsedColorFilter[];
  groups: UsedPropertyGroup[];
} {
  const hexByLabel = new Map<string, string>();
  const colorNames = new Set<string>();
  for (const category of categories) {
    for (const option of category.optionSchema) {
      const color =
        option.kind === "color" || isColorOptionName(option.name);
      if (!color) continue;
      colorNames.add(option.name.trim().toLowerCase());
      for (const value of option.values) {
        const label = value.label.trim();
        if (!label || hexByLabel.has(label.toLowerCase())) continue;
        hexByLabel.set(
          label.toLowerCase(),
          resolveValueHex(value) ?? "#94A3B8",
        );
      }
    }
  }

  const sizes = new Map<string, string>();
  const colors = new Map<string, UsedColorFilter>();
  const groups = new Map<string, { name: string; values: Map<string, string> }>();

  for (const product of products) {
    for (const variant of product.variants) {
      for (const [rawName, rawValue] of Object.entries(variant.options)) {
        const name = rawName.trim();
        const label = rawValue.trim();
        if (!name || !label) continue;
        const nameKey = name.toLowerCase();
        const labelKey = label.toLowerCase();

        if (isSizeOptionName(name)) {
          if (!sizes.has(labelKey)) sizes.set(labelKey, label);
          continue;
        }
        if (colorNames.has(nameKey) || isColorOptionName(name)) {
          if (!colors.has(labelKey)) {
            colors.set(labelKey, {
              label,
              hex: hexByLabel.get(labelKey) ?? "#94A3B8",
            });
          }
          continue;
        }
        const group = groups.get(nameKey) ?? {
          name,
          values: new Map<string, string>(),
        };
        if (!group.values.has(labelKey)) group.values.set(labelKey, label);
        groups.set(nameKey, group);
      }
    }
  }

  return {
    sizes: [...sizes.values()],
    colors: [...colors.values()],
    groups: [...groups.values()].map((group) => ({
      name: group.name,
      values: [...group.values.values()],
    })),
  };
}
