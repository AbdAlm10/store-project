/** Lightweight Arabic + Latin text normalization for catalog matching. */

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFKC")
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (!normalized) return [];
  return normalized.split(" ").filter((token) => token.length > 1);
}

export function jaccard(a: Iterable<string>, b: Iterable<string>): number {
  const left = new Set(
    [...a].map((item) => normalizeText(item)).filter(Boolean),
  );
  const right = new Set(
    [...b].map((item) => normalizeText(item)).filter(Boolean),
  );
  if (left.size === 0 || right.size === 0) return 0;
  let intersection = 0;
  for (const item of left) {
    if (right.has(item)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
