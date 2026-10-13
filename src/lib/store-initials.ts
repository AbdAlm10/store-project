/** Two-letter mark from the store name, skipping a leading Arabic "ال". */
export function storeInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}]+/u, ""))
    .map((word) => word.replace(/^ال(?=\p{L})/u, ""))
    .filter((word) => word.length > 0);

  if (words.length === 0) return "د";

  const first = words[0].slice(0, 1);
  if (words.length === 1) {
    const second = words[0].slice(1, 2);
    return upperLatin(first + second);
  }
  return upperLatin(first + words[1].slice(0, 1));
}

function upperLatin(value: string): string {
  return value.replace(/[a-z]/g, (letter) => letter.toUpperCase());
}
