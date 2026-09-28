import { LockKeyhole } from "lucide-react";
import type { Store } from "@/domain/types/entities";
import { StoreNav } from "@/components/storefront/store-header";

export function SubscriptionLockedView({
  store,
  title,
  body,
}: {
  store: Store;
  title: string;
  body: string;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <StoreNav store={store} locked />
      <main className="flex flex-1 items-center justify-center px-6 py-24 text-center">
        <div className="flex max-w-md flex-col items-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-800">
            <LockKeyhole className="h-8 w-8" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-6 text-2xl font-bold" style={{ color: "var(--store-text)" }}>
            {title}
          </h1>
          <p className="mt-3 text-sm leading-7" style={{ color: "var(--store-muted)" }}>
            {body}
          </p>
        </div>
      </main>
    </div>
  );
}