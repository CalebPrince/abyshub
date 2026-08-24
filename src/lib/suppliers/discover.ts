import "server-only";

import { unstable_cache } from "next/cache";

import { assertAllowedUrl } from "@/lib/suppliers/fetch";
import { supplierById } from "@/lib/suppliers/registry";

/**
 * Enumerates a partner's catalogue from the sitemap they publish for search
 * engines.
 *
 * That file is the list they *want* crawled, which makes it both the complete
 * answer and the polite one — no guessing at URL patterns and no walking their
 * category pages.
 *
 * Cached for an hour: a 400-entry sitemap does not change between the chunks
 * of one import, and re-fetching it on every chunk would be several hundred
 * needless requests over a full run.
 */

const DISCOVERY_TTL = 3600;

function locs(xml: string) {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) =>
    m[1].replace(/&amp;/g, "&").trim()
  );
}

/** True for a localised copy of a sitemap — `/es/…`, `/fr-ca/…` and the like. */
function isTranslation(url: string) {
  try {
    return /^\/[a-z]{2}(-[a-z]{2})?\//i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

async function fetchXml(url: string) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AbysHubCatalogueImporter/1.0 (authorised reseller)",
      accept: "application/xml,text/xml",
    },
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Sitemap returned ${response.status}.`);
  return response.text();
}

const discover = unstable_cache(
  async (supplierId: string): Promise<string[]> => {
    const supplier = supplierById(supplierId);
    if (!supplier?.sitemapUrl) return [];

    assertAllowedUrl(supplier.sitemapUrl);
    const root = await fetchXml(supplier.sitemapUrl);

    let urls: string[] = [];

    if (root.includes("<sitemapindex")) {
      // An index of sitemaps. Only the ones that look like products are worth
      // opening — pages, collections and blogs are not catalogue.
      const productSitemaps = locs(root).filter((u) => /product/i.test(u));

      // Tupperware indexes an /es/ and an /fr/ copy of every product as well.
      // Following those would treble the work and, on a refresh, quietly leave
      // the shelf in French. Only drop them if something un-prefixed survives,
      // so a partner who serves their own language under /uk/ still imports.
      const canonical = productSitemaps.filter((u) => !isTranslation(u));
      const children = canonical.length > 0 ? canonical : productSitemaps;
      for (const child of children) {
        try {
          assertAllowedUrl(child);
          urls.push(...locs(await fetchXml(child)));
        } catch {
          // One unreadable sub-sitemap should not lose the others.
        }
      }
    } else {
      urls = locs(root);
    }

    // Both partners put products under /products/. The sitemap also lists the
    // homepage and other odds and ends, which are not importable.
    const productUrls = urls.filter((u) => /\/products?\//i.test(u));

    return [...new Set(productUrls)];
  },
  ["supplier-catalogue-urls"],
  { revalidate: DISCOVERY_TTL, tags: ["supplier-discovery"] }
);

export async function discoverProductUrls(supplierId: string) {
  return discover(supplierId);
}
