import { getCachedStorefront } from "@/lib/storefront-data";
import { isReservedStoreSlug } from "@/lib/reserved-slugs";
import { notFound } from "next/navigation";

export default async function StoreSlugLayout({
  children,
  params,
}: LayoutProps<"/[storeSlug]">) {
  const { storeSlug } = await params;
  if (isReservedStoreSlug(storeSlug)) notFound();

  let store: Awaited<ReturnType<typeof getCachedStorefront>> | null = null;
  try {
    store = await getCachedStorefront(storeSlug);
  } catch {
    store = null;
  }
  if (!store) notFound();

  return children;
}
