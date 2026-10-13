import type { Category, Product, Store } from "@/domain/types/entities";
import type { MessageKey } from "@/i18n/messages";

export type StoreHealthItem = {
  id: string;
  labelKey: MessageKey;
  pendingLabelKey: MessageKey;
  done: boolean;
  href: string;
};

export type StoreHealth = {
  items: StoreHealthItem[];
  completed: number;
  total: number;
  percent: number;
};

export function computeStoreHealth(input: {
  store: Store;
  productCount: number;
  categoryCount: number;
}): StoreHealth {
  const { store, productCount, categoryCount } = input;

  const items: StoreHealthItem[] = [
    {
      id: "name",
      labelKey: "healthName",
      pendingLabelKey: "healthNameTodo",
      done: Boolean(store.name.trim()),
      href: "/dashboard/store",
    },
    {
      id: "logo",
      labelKey: "healthLogo",
      pendingLabelKey: "healthLogoTodo",
      done: Boolean(store.logoUrl),
      href: "/dashboard/store-design",
    },
    {
      id: "description",
      labelKey: "healthDescription",
      pendingLabelKey: "healthDescriptionTodo",
      done: Boolean(store.description?.trim()),
      href: "/dashboard/store",
    },
    {
      id: "whatsapp",
      labelKey: "healthWhatsapp",
      pendingLabelKey: "healthWhatsappTodo",
      done: Boolean(store.whatsapp?.trim()),
      href: "/dashboard/store",
    },
    {
      id: "product",
      labelKey: "healthProduct",
      pendingLabelKey: "healthProductTodo",
      done: productCount > 0,
      href: "/dashboard/products/new",
    },
    {
      id: "category",
      labelKey: "healthCategory",
      pendingLabelKey: "healthCategoryTodo",
      done: categoryCount > 0,
      href: "/dashboard/categories",
    },
    {
      id: "published",
      labelKey: "healthPublished",
      pendingLabelKey: "healthPublishedTodo",
      done: store.status === "published",
      href: "/dashboard/store",
    },
  ];

  const completed = items.filter((item) => item.done).length;
  const total = items.length;

  return {
    items,
    completed,
    total,
    percent: Math.round((completed / total) * 100),
  };
}

export function isCatalogEmpty(
  products: Pick<Product, "id">[],
  categories: Pick<Category, "id">[],
): boolean {
  return products.length === 0 && categories.length === 0;
}
