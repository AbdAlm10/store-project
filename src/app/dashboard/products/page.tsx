import Link from "next/link";
import { redirect } from "next/navigation";
import { getServices } from "@/infrastructure/container";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/forms";
import { EmptyState } from "@/components/ui/feedback";
import { SafeImage } from "@/components/ui/safe-image";
import { PageHeader, StatusBadge } from "@/components/dashboard/page-header";
import { DashboardCard } from "@/components/dashboard/ui";
import { ProductActions } from "@/features/products/product-actions";
import { formatMoney } from "@/lib/social/sharing";
import type { ProductStatus } from "@/domain/types/enums";
import { getRequestLocale } from "@/i18n/get-locale";
import { createTranslator } from "@/i18n/messages";

export const metadata = {
  title: "Products",
  robots: { index: false, follow: false },
};

type Props = {
  searchParams: Promise<{ q?: string; status?: string }>;
};

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const services = getServices();
  const stores = await services.stores.listMyStores();
  if (stores.length === 0) redirect("/onboarding");
  const store = stores[0];
  const locale = await getRequestLocale();
  const t = createTranslator(locale);

  const statusFilter =
    params.status &&
    ["draft", "published", "archived", "hidden"].includes(params.status)
      ? (params.status as ProductStatus)
      : undefined;

  const products = await services.products.listForMerchant(store.id, {
    pageSize: 50,
    search: params.q,
    status: statusFilter,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("products")}
        description={t("productsPageDesc")}
        actions={
          <Link href="/dashboard/products/new">
            <Button>{t("addProduct")}</Button>
          </Link>
        }
      />

      <DashboardCard padding="sm">
        <form className="flex flex-col gap-3 sm:flex-row">
          <Input
            name="q"
            defaultValue={params.q}
            placeholder={t("searchProductsPlaceholder")}
            aria-label={t("searchProductsAria")}
          />
          <Select
            name="status"
            defaultValue={params.status ?? ""}
            aria-label={t("filterByStatus")}
            className="sm:w-44"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="published">{t("published")}</option>
            <option value="draft">{t("draft")}</option>
            <option value="hidden">{t("hidden")}</option>
            <option value="archived">{t("archived")}</option>
          </Select>
          <Button type="submit" variant="outline">
            {t("filter")}
          </Button>
        </form>
      </DashboardCard>

      {products.items.length === 0 ? (
        <EmptyState
          title={
            params.q || params.status
              ? t("emptyMatchingProducts")
              : t("emptyProducts")
          }
          description={
            params.q || params.status
              ? t("emptyMatchingHint")
              : t("emptyProductsHint")
          }
          action={
            <Link href="/dashboard/products/new">
              <Button>{t("addProduct")}</Button>
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-3 md:hidden">
            {products.items.map((product) => {
              const image = product.images[0];
              return (
                <DashboardCard key={product.id} padding="sm">
                  <div className="flex gap-3">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {image ? (
                        <SafeImage
                          src={image.url}
                          alt={image.alt ?? product.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <Link
                        href={`/dashboard/products/${product.id}`}
                        className="font-semibold text-slate-900"
                      >
                        {product.name}
                      </Link>
                      <p className="mt-1 text-sm text-slate-500">
                        {formatMoney(product.price, product.currency, locale)}
                      </p>
                      <div className="mt-2">
                        <StatusBadge status={product.status} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProductActions
                      storeId={store.id}
                      productId={product.id}
                      productName={product.name}
                      previewHref={
                        product.status === "published"
                          ? `/${store.slug}/products/${product.slug}`
                          : undefined
                      }
                    />
                  </div>
                </DashboardCard>
              );
            })}
          </div>

          <DashboardCard padding="none" className="hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-100 text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">{t("productCol")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("price")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("stock")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("status")}</th>
                    <th className="px-5 py-3.5 font-medium">{t("actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {products.items.map((product) => {
                    const image = product.images[0];
                    return (
                      <tr
                        key={product.id}
                        className="border-b border-slate-50 last:border-0"
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="relative h-11 w-11 overflow-hidden rounded-xl bg-slate-100">
                              {image ? (
                                <SafeImage
                                  src={image.url}
                                  alt=""
                                  fill
                                  className="object-cover"
                                  sizes="44px"
                                />
                              ) : null}
                            </div>
                            <div>
                              <Link
                                href={`/dashboard/products/${product.id}`}
                                className="font-medium text-slate-900 hover:underline"
                              >
                                {product.name}
                              </Link>
                              {product.featured ? (
                                <p className="text-xs text-brand-700">
                                  {t("featured")}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-700">
                          {formatMoney(product.price, product.currency, locale)}
                        </td>
                        <td className="px-5 py-3.5 text-slate-500">
                          {product.stock == null ? "—" : product.stock}
                        </td>
                        <td className="px-5 py-3.5">
                          <StatusBadge status={product.status} />
                        </td>
                        <td className="px-5 py-3.5">
                          <ProductActions
                            storeId={store.id}
                            productId={product.id}
                            productName={product.name}
                            previewHref={
                              product.status === "published"
                                ? `/${store.slug}/products/${product.slug}`
                                : undefined
                            }
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </DashboardCard>
        </>
      )}
    </div>
  );
}
