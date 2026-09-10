import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";
import { demoSeed } from "@/infrastructure/demo/seed";
import { categoryUrl, productUrl, storeUrl } from "@/lib/social/sharing";

export default function sitemap(): MetadataRoute.Sitemap {
  const store = demoSeed.stores[0];
  const entries: MetadataRoute.Sitemap = [
    {
      url: appConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: storeUrl(store.slug),
      changeFrequency: "daily",
      priority: 0.9,
    },
  ];

  for (const category of demoSeed.categories) {
    entries.push({
      url: categoryUrl(store.slug, category.slug),
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const product of demoSeed.products) {
    entries.push({
      url: productUrl(store.slug, product.slug),
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  return entries;
}
