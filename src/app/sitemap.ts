import type { MetadataRoute } from "next";
import { appConfig } from "@/config/app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: appConfig.url,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${appConfig.url}/pricing`,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
