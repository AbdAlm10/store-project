/**
 * Plan cap for product options. A group is one axis (لون، مقاس، خامة).
 * Combinations such as 3 sizes × 2 colors are variant rows, not extra groups.
 */

export const OPTION_GROUP_LIMIT_TEMPLATE =
  "خطتك تسمح بـ {count} خيارات لكل منتج (مثل اللون والمقاس)، وليس بعدد التركيبات. 3 مقاسات × لونان يبقى ضمن الحد. رقِّ إلى Pro للمزيد.";

export function optionGroupLimitMessage(limit: number): string {
  return OPTION_GROUP_LIMIT_TEMPLATE.replaceAll("{count}", String(limit));
}

/** Distinct non-empty option names across variant rows. */
export function countOptionGroups(
  variants: ReadonlyArray<{
    options?: Record<string, string | null | undefined> | null;
  }>,
): number {
  const names = new Set<string>();
  for (const variant of variants) {
    const options = variant.options;
    if (!options) continue;
    for (const key of Object.keys(options)) {
      const name = key.trim();
      if (name) names.add(name);
    }
  }
  return names.size;
}
