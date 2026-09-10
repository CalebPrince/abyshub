import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";
import { getCatalogue } from "@/lib/shop/catalogue";

const base = SITE_URL.replace(/\/+$/, "");

type Freq = MetadataRoute.Sitemap[number]["changeFrequency"];

const STATIC: { path: string; changeFrequency: Freq; priority: number }[] = [
  { path: "/", changeFrequency: "daily", priority: 1 },
  { path: "/products", changeFrequency: "daily", priority: 0.9 },
  { path: "/offers", changeFrequency: "weekly", priority: 0.7 },
  { path: "/sales-agent", changeFrequency: "monthly", priority: 0.5 },
  { path: "/jbco", changeFrequency: "monthly", priority: 0.4 },
  { path: "/jibu-water", changeFrequency: "monthly", priority: 0.4 },
  { path: "/media", changeFrequency: "monthly", priority: 0.4 },
  { path: "/contact", changeFrequency: "yearly", priority: 0.3 },
  { path: "/enquiry", changeFrequency: "yearly", priority: 0.3 },
  { path: "/legal/privacy", changeFrequency: "yearly", priority: 0.1 },
  { path: "/legal/terms", changeFrequency: "yearly", priority: 0.1 },
  { path: "/legal/cookies", changeFrequency: "yearly", priority: 0.1 },
];

/**
 * Reads the same cached catalogue the storefront runs on, so this route is
 * static and rides the CATALOGUE_TAG invalidation like every other page —
 * no separate timer.
 *
 * Only in-stock products are listed. Most of the catalogue is deliberately out
 * of stock right now; pointing a crawler at ~700 "ask us when it lands" pages
 * would be all cost and no signal.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { products } = await getCatalogue();
  const now = new Date();

  return [
    ...STATIC.map((s) => ({
      url: `${base}${s.path}`,
      lastModified: now,
      changeFrequency: s.changeFrequency,
      priority: s.priority,
    })),
    ...products
      .filter((product) => product.slug && product.inStock)
      .map((product) => ({
        url: `${base}/products/${product.slug}`,
        lastModified: now,
        changeFrequency: "weekly" as Freq,
        priority: 0.7,
        ...(product.image ? { images: [product.image] } : {}),
      })),
  ];
}
