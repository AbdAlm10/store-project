import Link from "next/link";

export function SubscriptionPreviewBanner({
  message,
  action,
}: {
  message: string;
  action: string;
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 bg-amber-100 px-4 py-3 text-center text-sm font-semibold text-amber-950">
      <span>{message}</span>
      <Link
        href="/dashboard/subscription"
        className="rounded-full bg-amber-950 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-amber-800"
      >
        {action}
      </Link>
    </div>
  );
}