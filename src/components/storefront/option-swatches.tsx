import { cn } from "@/lib/utils/cn";

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
          ? `0 0 0 2px var(--store-bg, #fff), 0 0 0 3px var(--store-text, #1c241e)`
          : undefined,
      }}
    />
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
              background: "transparent",
              color: "var(--store-muted)",
            }
      }
    >
      {label}
    </button>
  );
}
