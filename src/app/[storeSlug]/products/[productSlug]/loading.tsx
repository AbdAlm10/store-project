export default function ProductLoading() {
  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--store-bg, #f7f4ef)",
        color: "var(--store-text, #1c241e)",
      }}
    >
      <div
        className="border-b"
        style={{
          minHeight: "4rem",
          background:
            "color-mix(in srgb, var(--store-nav, #fff) 55%, transparent)",
          borderColor:
            "color-mix(in srgb, var(--store-border, #ebe0c4) 35%, transparent)",
        }}
      />

      <div className="w-full px-4 pt-4 pb-5 sm:px-8 sm:pt-5 sm:pb-8 lg:px-12 xl:px-16">
        <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-12 xl:gap-20 2xl:gap-24">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-stretch">
            <div className="order-2 hidden gap-3 sm:order-1 sm:flex sm:w-20 sm:flex-col sm:gap-4 sm:ps-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="aspect-square animate-pulse rounded-xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, var(--store-surface, #fff))",
                  }}
                />
              ))}
            </div>
            <div
              className="relative order-1 aspect-4/5 w-full flex-1 animate-pulse overflow-hidden rounded-xl sm:order-2 lg:aspect-auto lg:min-h-[min(78vh,52rem)]"
              style={{
                background:
                  "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, var(--store-surface, #fff))",
              }}
            />
          </div>

          <div className="flex min-w-0 flex-col gap-5 lg:gap-8">
            <div className="space-y-3">
              <div className="hidden gap-2 sm:flex">
                <div
                  className="h-4 w-10 animate-pulse rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 60%, transparent)",
                  }}
                />
                <div
                  className="h-4 w-12 animate-pulse rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 50%, transparent)",
                  }}
                />
              </div>
              <div
                className="h-10 w-2/3 animate-pulse rounded sm:h-12"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 65%, transparent)",
                }}
              />
              <div
                className="h-4 w-28 animate-pulse rounded"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, transparent)",
                }}
              />
              <div className="space-y-2 pt-1">
                <div
                  className="h-3.5 w-full animate-pulse rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 40%, transparent)",
                  }}
                />
                <div
                  className="h-3.5 w-5/6 animate-pulse rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 40%, transparent)",
                  }}
                />
                <div
                  className="h-3.5 w-4/5 animate-pulse rounded"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 35%, transparent)",
                  }}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="h-3 w-16 animate-pulse rounded"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 50%, transparent)",
                }}
              />
              <div className="flex gap-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-11 w-11 animate-pulse rounded-full"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div
                className="h-3 w-14 animate-pulse rounded"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 50%, transparent)",
                }}
              />
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div
                    key={index}
                    className="h-9 w-14 animate-pulse rounded-full"
                    style={{
                      background:
                        "color-mix(in srgb, var(--store-border, #ebe0c4) 45%, transparent)",
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-auto space-y-4 pt-2">
              <div
                className="h-10 w-36 animate-pulse rounded"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 65%, transparent)",
                }}
              />
              <div className="flex gap-3">
                <div
                  className="h-14 flex-1 animate-pulse rounded-2xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
                  }}
                />
                <div
                  className="h-14 w-14 animate-pulse rounded-2xl"
                  style={{
                    background:
                      "color-mix(in srgb, var(--store-border, #ebe0c4) 55%, transparent)",
                  }}
                />
              </div>
              <div
                className="h-5 w-20 animate-pulse rounded"
                style={{
                  background:
                    "color-mix(in srgb, var(--store-border, #ebe0c4) 40%, transparent)",
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
