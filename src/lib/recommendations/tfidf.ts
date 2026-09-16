import { tokenize } from "@/lib/recommendations/tokenize";

/** Sparse TF-IDF vectors + cosine similarity for product text. */

export type SparseVector = Map<string, number>;

export function buildDocument(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function termFrequency(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1);
  }
  const total = tokens.length || 1;
  for (const [token, count] of tf) {
    tf.set(token, count / total);
  }
  return tf;
}

export function buildIdf(documents: string[][]): Map<string, number> {
  const df = new Map<string, number>();
  const n = documents.length || 1;
  for (const tokens of documents) {
    const unique = new Set(tokens);
    for (const token of unique) {
      df.set(token, (df.get(token) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [token, count] of df) {
    idf.set(token, Math.log((1 + n) / (1 + count)) + 1);
  }
  return idf;
}

export function toTfIdfVector(
  tokens: string[],
  idf: Map<string, number>,
): SparseVector {
  const tf = termFrequency(tokens);
  const vector: SparseVector = new Map();
  for (const [token, weight] of tf) {
    vector.set(token, weight * (idf.get(token) ?? 0));
  }
  return vector;
}

export function cosineSimilarity(a: SparseVector, b: SparseVector): number {
  if (a.size === 0 || b.size === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [, value] of a) normA += value * value;
  for (const [, value] of b) normB += value * value;
  if (normA === 0 || normB === 0) return 0;

  const [smaller, larger] = a.size <= b.size ? [a, b] : [b, a];
  for (const [token, value] of smaller) {
    const other = larger.get(token);
    if (other) dot += value * other;
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function documentTokens(text: string): string[] {
  return tokenize(text);
}
