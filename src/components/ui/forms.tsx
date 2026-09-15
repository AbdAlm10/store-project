import { cn } from "@/lib/utils/cn";

export { Select } from "@/components/ui/select-menu";

export function Input({
  className,
  value,
  defaultValue,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  const controlled =
    value !== undefined
      ? { value: value ?? "" }
      : defaultValue !== undefined
        ? { defaultValue }
        : {};
  return (
    <input
      className={cn(
        "h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        className,
      )}
      {...props}
      {...controlled}
    />
  );
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-28 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.04)] placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300",
        className,
      )}
      {...props}
    />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium text-slate-600", className)}
      {...props}
    />
  );
}
