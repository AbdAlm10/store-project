import Link from "next/link";
import { MapPin, Phone, Send } from "lucide-react";
import type { Store } from "@/domain/types/entities";
import { SafeImage } from "@/components/ui/safe-image";
import { TodayHours } from "@/components/storefront/today-hours";

export function StoreNav({ store }: { store: Store }) {
  return (
    <nav
      className="sticky top-0 z-20 border-b backdrop-blur-md"
      style={{
        background: "color-mix(in srgb, var(--store-nav) 90%, transparent)",
        borderColor: "var(--store-border)",
        color: "var(--store-text)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href={`/${store.slug}`}
          prefetch
          className="flex min-w-0 items-center gap-2.5"
        >
          <div
            className="relative h-9 w-9 shrink-0 overflow-hidden ring-1 ring-black/10"
            style={{ borderRadius: "calc(var(--store-radius) * 0.55)" }}
          >
            {store.logoUrl ? (
              <SafeImage
                src={store.logoUrl}
                alt={`${store.name} logo`}
                fill
                className="object-cover"
                sizes="36px"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center text-sm font-bold"
                style={{
                  backgroundColor: "var(--store-accent)",
                  color: "var(--store-button-text)",
                }}
              >
                {store.name.slice(0, 1)}
              </div>
            )}
          </div>
          <span
            className="truncate text-lg tracking-tight"
            style={{ fontFamily: "var(--store-font-display)" }}
          >
            {store.name}
          </span>
        </Link>
        {store.whatsapp ? (
          <a
            href={`https://wa.me/${store.whatsapp.replace(/[^\d]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition active:scale-[0.98]"
            style={{
              backgroundColor: "var(--store-accent)",
              color: "var(--store-button-text)",
            }}
          >
            واتساب
          </a>
        ) : null}
      </div>
    </nav>
  );
}

export function StoreHero({
  store,
  closedLabel = "مغلق",
}: {
  store: Store;
  closedLabel?: string;
}) {
  return (
    <header
      className="overflow-hidden text-white"
      style={{
        background: `linear-gradient(135deg, var(--store-header-from), var(--store-header-to))`,
      }}
    >
      <div className="relative px-4 py-10 sm:px-6 sm:py-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, white 0, transparent 40%), radial-gradient(circle at 85% 0%, white 0, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-end gap-4">
            <div
              className="relative h-20 w-20 overflow-hidden ring-4 ring-black/20 sm:h-24 sm:w-24"
              style={{ borderRadius: "var(--store-radius)" }}
            >
              {store.logoUrl ? (
                <SafeImage
                  src={store.logoUrl}
                  alt={`${store.name} logo`}
                  fill
                  priority
                  className="object-cover"
                />
              ) : (
                <div
                  className="flex h-full w-full items-center justify-center text-3xl font-bold"
                  style={{
                    backgroundColor: "var(--store-accent)",
                    color: "var(--store-button-text)",
                  }}
                >
                  {store.name.slice(0, 1)}
                </div>
              )}
            </div>
            <div className="pb-1">
              <h1
                className="text-3xl tracking-tight sm:text-4xl"
                style={{ fontFamily: "var(--store-font-display)" }}
              >
                {store.name}
              </h1>
              {store.location ? (
                <p className="mt-1 flex items-center gap-1.5 text-sm text-white/80">
                  <MapPin className="h-3.5 w-3.5" aria-hidden />
                  {store.location}
                </p>
              ) : null}
            </div>
          </div>
          {store.description ? (
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-white/85 sm:text-base">
              {store.description}
            </p>
          ) : null}
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-white/80">
            <TodayHours
              openingHours={store.openingHours}
              closedLabel={closedLabel}
            />
            {store.phone ? (
              <a
                href={`tel:${store.phone}`}
                className="inline-flex items-center gap-1.5 hover:text-white"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {store.phone}
              </a>
            ) : null}
          </div>
          <div className="mt-4 flex gap-3">
            {store.instagram ? (
              <SocialLink href={store.instagram} label="Instagram">
                <span className="text-xs font-bold">IG</span>
              </SocialLink>
            ) : null}
            {store.facebook ? (
              <SocialLink href={store.facebook} label="Facebook">
                <span className="text-xs font-bold">f</span>
              </SocialLink>
            ) : null}
            {store.telegram ? (
              <SocialLink href={store.telegram} label="Telegram">
                <Send className="h-4 w-4" />
              </SocialLink>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}

/** @deprecated use StoreNav + StoreHero */
export function StoreHeader({
  store,
  closedLabel = "مغلق",
}: {
  store: Store;
  closedLabel?: string;
}) {
  return (
    <>
      <StoreNav store={store} />
      <StoreHero store={store} closedLabel={closedLabel} />
    </>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
    >
      {children}
    </Link>
  );
}
