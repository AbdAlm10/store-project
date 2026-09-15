import { ProductCardSkeleton } from "@/components/storefront/product-card";

export default function StoreLoading() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--store-bg, #f7f4ef)" }}
    >
      <div
        className="border-b"
        style={{
          minHeight: "4rem",
          background: "color-mix(in srgb, var(--store-nav, #fff) 55%, transparent)",
          borderColor:
            "color-mix(in srgb, var(--store-border, #ebe0c4) 35%, transparent)",
        }}
      />

      <div className="mx-auto max-w-[100rem] px-3 py-4 sm:px-4 lg:px-5 xl:px-6">
        <div
          className="mx-auto h-11 max-w-3xl animate-pulse rounded-full"
          style={{ background: "var(--store-surface, #fff)" }}
        />

        <div className="mt-4 flex gap-2.5 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="flex shrink-0 flex-col items-center gap-1"
            >
              <div
                className="h-10 w-10 animate-pulse rounded-full sm:h-11 sm:w-11"
                style={{ background: "var(--store-surface, #fff)" }}
              />
              <div
                className="h-2 w-8 animate-pulse rounded"
                style={{ background: "var(--store-surface, #fff)" }}
              />
            </div>
          ))}
        </div>

        <div
          className="mt-5 mb-3 h-7 w-40 animate-pulse rounded"
          style={{ background: "var(--store-surface, #fff)" }}
        />

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2.5 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
