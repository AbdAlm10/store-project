import { cn } from "@/lib/utils/cn";
import { contrastingInk } from "@/lib/option-colors";

export function ColorSwatchButton({
  label,
  hex,
  selected,
  disabled,
  size = "md",
  onClick,
  title,
}: {
  label: string;
  hex: string;
  selected?: boolean;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  onClick?: () => void;
  title?: string;
}) {
  const dim =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-11 w-11" : "h-9 w-9";
  const ink = contrastingInk(hex);

  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      title={title ?? `${label} (${hex})`}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "relative shrink-0 rounded-full transition",
        dim,
        selected && "scale-105",
        disabled && "cursor-not-allowed opacity-35",
        onClick && "active:scale-95",
      )}
      style={{
        background: hex,
        boxShadow: selected
          ? `0 0 0 2px var(--store-bg, #fff), 0 0 0 4px var(--store-accent, #0d9488)`
          : `inset 0 0 0 1px rgb(0 0 0 / 18%)`,
      }}
    >
      {selected && size !== "sm" ? (
        <span
          className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
          style={{ color: ink }}
        >
          ✓
        </span>
      ) : null}
    </button>
  );
}

export function TextOptionChip({
  label,
  selected,
  disabled,
  onClick,
}: {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled || !onClick}
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-2 text-sm font-medium transition active:scale-[0.98]",
        disabled && "cursor-not-allowed opacity-35",
      )}
      style={
        selected
          ? {
              background: "var(--store-accent)",
              color: "var(--store-button-text)",
            }
          : {
              background: "var(--store-card)",
              color: "var(--store-text)",
              boxShadow: "inset 0 0 0 1px var(--store-border)",
            }
      }
    >
      {label}
    </button>
  );
}
