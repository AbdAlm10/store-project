import { StoreNavActions } from "@/components/storefront/store-nav-actions";
import { SafeImage } from "@/components/ui/safe-image";
import type { Store } from "@/domain/types/entities";
import { resolveNavbarActions } from "@/lib/navbar-actions";
import { MapPin } from "lucide-react";
import Link from "next/link";

export function StoreNav({ store }: { store: Store }) {
  const actions = resolveNavbarActions(store);

  return (
    <nav
      className="sticky top-0 z-30 border-b"
      style={{
        background: "color-mix(in srgb, var(--store-nav) 55%, transparent)",
        borderColor: "color-mix(in srgb, var(--store-border) 35%, transparent)",
        color: "var(--store-nav-text)",
        backdropFilter: "blur(20px) saturate(1.35)",
        WebkitBackdropFilter: "blur(20px) saturate(1.35)",
        boxShadow:
          "0 1px 0 color-mix(in srgb, var(--store-border) 40%, transparent), 0 12px 40px -28px rgba(0,0,0,0.18)",
      }}
    >
      <div
        className="mx-auto flex max-w-[100rem] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5 xl:px-6"
        style={{
          minHeight: "calc(var(--store-logo-size) + 1.5rem)",
        }}
      >
        <Link
          href={`/${store.slug}`}
          prefetch
          className="flex min-w-0 items-center gap-3"
        >
          {store.logoUrl ? (
            <SafeImage
              src={store.logoUrl}
              alt={`${store.name} logo`}
              width={320}
              height={96}
              className="w-auto max-w-[min(20rem,55vw)] shrink-0 object-contain object-start"
              style={{
                height: "var(--store-logo-size)",
                maxHeight: "var(--store-logo-size)",
              }}
              sizes="(max-width: 640px) 55vw, 320px"
            />
          ) : (
            <div
              className="flex shrink-0 items-center justify-center text-base font-bold sm:text-lg"
              style={{
                height: "var(--store-logo-size)",
                width: "var(--store-logo-size)",
                borderRadius: "calc(var(--store-radius) * 0.65)",
                backgroundColor: "var(--store-accent)",
                color: "var(--store-button-text)",
              }}
            >
              {store.name.slice(0, 1)}
            </div>
          )}
          <div className="min-w-0">
            <span
              className="block truncate text-xl font-bold tracking-tight sm:text-2xl"
              style={{ fontFamily: "var(--store-font-display)" }}
            >
              {store.name}
            </span>
            {store.location && !actions.includes("location") ? (
              <span className="mt-0.5 flex min-w-0 items-center text-xs opacity-75 sm:text-sm">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                <span className="truncate">{store.location}</span>
              </span>
            ) : null}
          </div>
        </Link>

        <StoreNavActions store={store} actions={actions} />
      </div>
    </nav>
  );
}
