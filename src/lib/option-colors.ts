import type {
  CategoryOptionDef,
  CategoryOptionValue,
} from "@/domain/types/entities";

const HEX_RE = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;

const NAME_HEX: Record<string, string> = {
  black: "#111827",
  white: "#F8FAFC",
  red: "#DC2626",
  blue: "#2563EB",
  green: "#16A34A",
  beige: "#D6C3A8",
  pink: "#EC4899",
  clear: "#E2E8F0",
  transparent: "#E2E8F0",
  silver: "#CBD5E1",
  gold: "#D4AF37",
  brown: "#92400E",
  yellow: "#EAB308",
  purple: "#7C3AED",
  orange: "#EA580C",
  gray: "#6B7280",
  grey: "#6B7280",
  navy: "#1E3A8A",
  cream: "#FFF7ED",
  اسود: "#111827",
  أسود: "#111827",
  ابيض: "#F8FAFC",
  أبيض: "#F8FAFC",
  احمر: "#DC2626",
  أحمر: "#DC2626",
  ازرق: "#2563EB",
  أزرق: "#2563EB",
  اخضر: "#16A34A",
  أخضر: "#16A34A",
  وردي: "#EC4899",
  شفاف: "#E2E8F0",
  siyah: "#111827",
  beyaz: "#F8FAFC",
  kirmizi: "#DC2626",
  kırmızı: "#DC2626",
  mavi: "#2563EB",
  yesil: "#16A34A",
  yeşil: "#16A34A",
  pembe: "#EC4899",
};

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value.trim());
}

export function normalizeHex(value: string): string | null {
  const raw = value.trim();
  if (!HEX_RE.test(raw)) return null;
  if (raw.length === 4) {
    const [, r, g, b] = raw;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return raw.toUpperCase();
}

/** Parse "Red", "#FF0000", "Red|#FF0000", "Red #FF0000". */
export function parseOptionValueInput(raw: string): CategoryOptionValue {
  const text = raw.trim();
  if (!text) return { label: "" };

  const pipe = text.split("|").map((part) => part.trim());
  if (pipe.length === 2 && isHexColor(pipe[1])) {
    return { label: pipe[0] || pipe[1], hex: normalizeHex(pipe[1]) };
  }

  const spaced = text.match(/^(.*?)[\s,]+(#[0-9A-Fa-f]{3,6})$/);
  if (spaced) {
    const label = spaced[1].trim();
    const hex = normalizeHex(spaced[2]);
    return { label: label || spaced[2], hex };
  }

  if (isHexColor(text)) {
    const hex = normalizeHex(text)!;
    return { label: hex, hex };
  }

  return { label: text, hex: null };
}

export function isColorOptionName(name: string): boolean {
  return /color|colour|لون|renk|tone|finish|shade/i.test(name.trim());
}

export function isSizeOptionName(name: string): boolean {
  return /^(size|sizes|مقاس|مقاسات|beden|taille)$/i.test(name.trim()) ||
    /\b(size|مقاس|beden)\b/i.test(name.trim());
}

export function guessHexFromLabel(label: string): string | null {
  const key = label.trim().toLowerCase();
  if (isHexColor(key)) return normalizeHex(key);
  for (const [name, hex] of Object.entries(NAME_HEX)) {
    if (key === name || key.includes(name)) return hex;
  }
  return null;
}

export function resolveValueHex(
  value: CategoryOptionValue | string,
  fallbackGuess = true,
): string | null {
  if (typeof value === "string") {
    const parsed = parseOptionValueInput(value);
    return (
      parsed.hex ?? (fallbackGuess ? guessHexFromLabel(parsed.label) : null)
    );
  }
  return (
    (value.hex ? normalizeHex(value.hex) : null) ??
    (fallbackGuess ? guessHexFromLabel(value.label) : null)
  );
}

export function optionValueLabel(value: CategoryOptionValue | string): string {
  if (typeof value === "string") return parseOptionValueInput(value).label;
  return value.label;
}

export function normalizeOptionValue(
  value: unknown,
): CategoryOptionValue | null {
  if (typeof value === "string") {
    const parsed = parseOptionValueInput(value);
    return parsed.label ? parsed : null;
  }
  if (value && typeof value === "object") {
    const row = value as Record<string, unknown>;
    const label = String(row.label ?? row.name ?? "").trim();
    if (!label) return null;
    const hexRaw = row.hex != null ? String(row.hex) : "";
    return {
      label,
      hex: hexRaw ? normalizeHex(hexRaw) : null,
    };
  }
  return null;
}

export function normalizeOptionDef(raw: unknown): CategoryOptionDef | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const name = String(row.name ?? "").trim();
  if (!name) return null;
  const id =
    String(row.id ?? "").trim() ||
    `opt-${name.toLowerCase().replace(/\s+/g, "-")}`;
  const valuesRaw = Array.isArray(row.values) ? row.values : [];
  const values = valuesRaw
    .map(normalizeOptionValue)
    .filter((item): item is CategoryOptionValue => Boolean(item));
  const kind =
    row.kind === "color" || row.kind === "text"
      ? row.kind
      : isColorOptionName(name)
        ? "color"
        : "text";
  return { id, name, kind, values };
}

export function normalizeOptionSchema(raw: unknown): CategoryOptionDef[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(normalizeOptionDef)
    .filter((item): item is CategoryOptionDef => Boolean(item));
}

export function findHexInSchema(
  schema: CategoryOptionDef[] | null | undefined,
  optionName: string,
  label: string,
): string | null {
  if (!schema?.length) return guessHexFromLabel(label);
  const option = schema.find(
    (item) => item.name.toLowerCase() === optionName.toLowerCase(),
  );
  if (!option) return guessHexFromLabel(label);
  const match = option.values.find(
    (value) => value.label.toLowerCase() === label.toLowerCase(),
  );
  return (
    resolveValueHex(match ?? label, true) ?? guessHexFromLabel(label)
  );
}

/** Readable text on a colored swatch (black or white). */
export function contrastingInk(hex: string): "#111827" | "#FFFFFF" {
  const normalized = normalizeHex(hex) ?? "#000000";
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.62 ? "#111827" : "#FFFFFF";
}
