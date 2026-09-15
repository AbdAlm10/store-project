import { ProductCardSkeleton } from "@/components/storefront/product-card";

function pulse(style?: React.CSSProperties) {
  return {
    background:
      "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, var(--store-surface, #fff))",
    ...style,
  } as React.CSSProperties;
}

export default function StoreLoading() {
  return (
    <div
      className="flex min-h-dvh flex-col"
      style={{
        background: "var(--store-bg, #f7f4ef)",
        color: "var(--store-text, #1c241e)",
      }}
    >
      {/* Matches StoreNav */}
      <div
        className="sticky top-0 z-30 border-b"
        style={{
          background: "color-mix(in srgb, var(--store-nav, #fff) 55%, transparent)",
          borderColor:
            "color-mix(in srgb, var(--store-border, #ebe0c4) 35%, transparent)",
        }}
      >
        <div
          className="mx-auto flex max-w-[100rem] items-center justify-between gap-3 px-3 sm:px-4 lg:px-5 xl:px-6"
          style={{ minHeight: "4.5rem" }}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="h-12 w-12 shrink-0 animate-pulse rounded-2xl sm:h-14 sm:w-14"
              style={pulse()}
            />
            <div className="min-w-0 space-y-2">
              <div className="h-6 w-36 animate-pulse rounded sm:h-7 sm:w-48" style={pulse()} />
              <div className="h-3 w-24 animate-pulse rounded" style={pulse({ opacity: 0.7 })} />
            </div>
          </div>
          <div
            className="h-8 w-20 shrink-0 animate-pulse rounded-full sm:h-9 sm:w-28"
            style={pulse()}
          />
        </div>
      </div>

      <div className="relative mx-auto w-full max-w-[100rem] flex-1 px-3 pb-10 pt-2 sm:px-4 lg:px-5 xl:px-6 lg:pt-2.5">
        <div className="flex items-start gap-3 lg:gap-4" dir="ltr">
          <div className="min-w-0 flex-1" dir="rtl">
            <div className="mb-2.5 flex flex-col items-start gap-3">
              {/* Search pill */}
              <div
                className="h-9 w-full max-w-md animate-pulse rounded-full sm:h-10"
                style={pulse({
                  background:
                    "color-mix(in srgb, var(--store-surface, #fff) 88%, transparent)",
                })}
              />

              {/* Category bubbles */}
              <div className="flex gap-2 overflow-hidden">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={index}
                    className="flex shrink-0 flex-col items-center gap-1"
                  >
                    <div
                      className="h-10 w-10 animate-pulse rounded-full sm:h-11 sm:w-11"
                      style={pulse()}
                    />
                    <div className="h-2 w-10 animate-pulse rounded" style={pulse()} />
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-3 mt-2 flex items-center justify-between gap-3">
              <div className="h-7 w-40 animate-pulse rounded" style={pulse()} />
              <div
                className="hidden h-9 w-28 animate-pulse rounded-full lg:block"
                style={pulse()}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
              {Array.from({ length: 12 }).map((_, index) => (
                <ProductCardSkeleton key={index} />
              ))}
            </div>
          </div>

          {/* Filter sidebar — desktop only, mirrors FilterPanel strip */}
          <aside
            className="sticky top-24 hidden w-[17.5rem] shrink-0 animate-pulse rounded-[1.35rem] lg:block"
            style={{
              minHeight: "28rem",
              background: "var(--store-surface, #fff)",
              boxShadow:
                "inset 0 0 0 1px color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
            }}
          >
            <div className="space-y-4 p-4">
              <div className="h-5 w-24 rounded" style={pulse()} />
              <div className="h-10 w-full rounded-xl" style={pulse()} />
              <div className="h-5 w-20 rounded" style={pulse()} />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-8 w-14 rounded-full"
                    style={pulse()}
                  />
                ))}
              </div>
              <div className="h-5 w-16 rounded" style={pulse()} />
              <div className="h-2 w-full rounded-full" style={pulse()} />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-10 rounded-xl" style={pulse()} />
                <div className="h-10 rounded-xl" style={pulse()} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <footer
        className="mt-auto border-t py-2 text-center"
        style={{
          borderColor:
            "color-mix(in srgb, var(--store-border, #ebe0c4) 70%, transparent)",
          background: "var(--store-surface, #fff)",
        }}
      >
        <div className="mx-auto h-3 w-28 animate-pulse rounded" style={pulse()} />
        <div className="mx-auto mt-2 h-3 w-20 animate-pulse rounded" style={pulse()} />
      </footer>
    </div>
  );
}
