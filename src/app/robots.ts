import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/config";

const base = SITE_URL.replace(/\/+$/, "");

/**
 * The back office and anything session- or payment-bound has no place in an
 * index. `/products?` covers the faceted listing — every `?category=`,
 * `?brand=`, `?sort=`, `?page=` URL renders the same page filtered, so letting
 * a crawler walk that space just burns crawl budget (and, with the storefront
 * cached, forces regenerations). The bare `/products` and each
 * `/products/<slug>` stay crawlable and are what the sitemap lists.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api",
        "/auth",
        "/account",
        "/cart",
        "/checkout",
        "/products?",
      ],
    },
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
