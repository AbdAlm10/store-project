import { cn } from "@/lib/utils/cn";
import type { CSSProperties, ReactNode } from "react";

/**
 * Scroll reveal that stays readable if JavaScript never hydrates.
 * The motion is a CSS scroll timeline; browsers without it just show the content.
 */
export function Reveal({
  children,
  className,
  delayMs = 0,
}: {
  children: ReactNode;
  className?: string;
  delayMs?: number;
}) {
  const style: CSSProperties | undefined = delayMs
    ? { animationDelay: `${delayMs}ms` }
    : undefined;

  return (
    <div className={cn("ys-reveal", className)} style={style}>
      {children}
    </div>
  );
}
