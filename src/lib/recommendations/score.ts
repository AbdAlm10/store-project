import type { ProductWithMedia } from "@/domain/types/entities";
import { jaccard } from "@/lib/recommendations/tokenize";
import {
  buildDocument,
  buildIdf,
  cosineSimilarity,
  documentTokens,
  toTfIdfVector,
  type SparseVector,
} from "@/lib/recommendations/tfidf";

export type RecommendationScoreBreakdown = {
  text: number;
  category: number;
  tags: number;
  price: number;
  options: number;
  specs: number;
  popularity: number;
  featured: number;
  total: number;
};

export type ScoredRecommendation = {
  product: ProductWithMedia;
  score: number;
  breakdown: RecommendationScoreBreakdown;
};

const WEIGHTS = {
  text: 0.38,
  category: 0.22,
  tags: 0.14,
  price: 0.1,
  options: 0.08,
  specs: 0.04,
  popularity: 0.03,
  featured: 0.01,
} as const;

function productText(product: ProductWithMedia): string {
  return buildDocument([
    product.name,
    product.name,
    product.description,
    product.category?.name,
    ...product.tags,
    ...Object.entries(product.specifications).flatMap(([key, value]) => [
      key,
      value,
    ]),
    ...product.variants.flatMap((variant) => [
      variant.name,
      ...Object.values(variant.options),
    ]),
  ]);
}

function variantOptionValues(product: ProductWithMedia): string[] {
  const values: string[] = [];
  for (const variant of product.variants) {
    for (const value of Object.values(variant.options)) {
      if (value.trim()) values.push(value);
    }
  }
  return values;
}

function priceProximity(seedPrice: number, candidatePrice: number): number {
  if (seedPrice <= 0 || candidatePrice <= 0) return 0;
  const ratio =
    Math.min(seedPrice, candidatePrice) / Math.max(seedPrice, candidatePrice);
  // Soften distant prices; keep near-band products high.
  return Math.pow(ratio, 1.35);
}

function popularityScore(
  productId: string,
  popularity?: Map<string, number>,
): number {
  if (!popularity || popularity.size === 0) return 0;
  const views = popularity.get(productId) ?? 0;
  if (views <= 0) return 0;
  let max = 0;
  for (const value of popularity.values()) max = Math.max(max, value);
  return max > 0 ? views / max : 0;
}

export function recommendSimilarProducts(
  seed: ProductWithMedia,
  candidates: ProductWithMedia[],
  opts?: {
    limit?: number;
    minScore?: number;
    popularity?: Map<string, number>;
  },
): ScoredRecommendation[] {
  const limit = opts?.limit ?? 8;
  const minScore = opts?.minScore ?? 0.12;
  const pool = candidates.filter(
    (product) =>
      product.id !== seed.id &&
      product.status === "published" &&
      product.storeId === seed.storeId,
  );
  if (pool.length === 0) return [];

  const docs = [seed, ...pool].map((product) =>
    documentTokens(productText(product)),
  );
  const idf = buildIdf(docs);
  const seedVector = toTfIdfVector(docs[0], idf);
  const seedOptions = variantOptionValues(seed);
  const seedSpecEntries = Object.entries(seed.specifications).map(
    ([key, value]) => `${key}:${value}`,
  );

  const vectors: SparseVector[] = docs
    .slice(1)
    .map((tokens) => toTfIdfVector(tokens, idf));

  const scored: ScoredRecommendation[] = pool.map((product, index) => {
    const text = cosineSimilarity(seedVector, vectors[index]);
    const category =
      seed.categoryId && product.categoryId === seed.categoryId ? 1 : 0;
    const tags = jaccard(seed.tags, product.tags);
    const price = priceProximity(seed.price, product.price);
    const optionsOverlap = jaccard(seedOptions, variantOptionValues(product));
    const specs = jaccard(
      seedSpecEntries,
      Object.entries(product.specifications).map(
        ([key, value]) => `${key}:${value}`,
      ),
    );
    const popularity = popularityScore(product.id, opts?.popularity);
    const featured = product.featured ? 1 : 0;

    const total =
      text * WEIGHTS.text +
      category * WEIGHTS.category +
      tags * WEIGHTS.tags +
      price * WEIGHTS.price +
      optionsOverlap * WEIGHTS.options +
      specs * WEIGHTS.specs +
      popularity * WEIGHTS.popularity +
      featured * WEIGHTS.featured;

    return {
      product,
      score: total,
      breakdown: {
        text,
        category,
        tags,
        price,
        options: optionsOverlap,
        specs,
        popularity,
        featured,
        total,
      },
    };
  });

  return scored
    .filter((item) => item.score >= minScore)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (a.product.featured !== b.product.featured) {
        return Number(b.product.featured) - Number(a.product.featured);
      }
      return a.product.name.localeCompare(b.product.name, "ar");
    })
    .slice(0, limit);
}
