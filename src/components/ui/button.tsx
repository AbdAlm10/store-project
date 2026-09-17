import { cn } from "@/lib/utils/cn";
import { cva, type VariantProps } from "class-variance-authority";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        primary:
          "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-900/15",
        secondary:
          "bg-brand-50 text-brand-900 hover:bg-brand-100 shadow-sm shadow-brand-900/5",
        outline:
          "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50",
        ghost: "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        danger: "bg-red-600 text-white hover:bg-red-700",
        whatsapp: "bg-[#128C7E] text-white hover:bg-[#0e6e63]",
      },
      size: {
        sm: "h-9 rounded-xl px-3",
        md: "h-11 rounded-xl px-4",
        lg: "h-12 rounded-xl px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({
  className,
  variant,
  size,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
