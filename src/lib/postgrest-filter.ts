/**
 * Quote a value for a PostgREST `.or()` filter.
 * Commas, periods, and parentheses are syntax, so user search text must be quoted.
 */
export function postgrestIlikePattern(raw: string): string {
  const escaped = raw
    .replace(/\\/g, "\\\\")
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/"/g, '""');
  return `"%${escaped}%"`;
}

export function postgrestOrIlike(
  columns: readonly string[],
  raw: string,
): string {
  const pattern = postgrestIlikePattern(raw);
  return columns.map((column) => `${column}.ilike.${pattern}`).join(",");
}
