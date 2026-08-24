/**
 * A partner brand the catalogue can be fed from.
 *
 * Adding the next one should be writing a definition and nothing else — no
 * change to the import action, the dialog, or the database. Everything that
 * differs between partners is named here.
 */
export type Supplier = {
  /** Stable key stored on every product row. Never rename one in use. */
  id: string;
  label: string;
  /** Hosts this partner is served from. Doubles as the fetch allowlist. */
  hosts: string[];
  /** Fallback when the page does not name a brand of its own. */
  defaultBrand: string;
  /** One line for the partners section. */
  blurb?: string;
  /**
   * Path to an official logo in /public, once one has been supplied through
   * the partner portal. Absent means the partners section sets the name as a
   * wordmark instead — better than a fabricated mark or a hotlink to whatever
   * seasonal asset the partner happens to be serving today.
   */
  logo?: string;
  /** The currency their listed prices are in — never ours. */
  currency: string;
  /**
   * Where their catalogue can be enumerated, when they publish one. Bulk
   * discovery is not wired up yet; recording it means the next person does not
   * have to go looking.
   */
  sitemapUrl?: string;
  /** Maps their wording onto one of our category slugs. */
  categoryFor(input: { supplierCategory: string | null; name: string; brand: string }): string;
};

/** What a supplier page yields, before any of our own decisions are applied. */
export type SupplierProduct = {
  supplierId: string;
  name: string;
  description: string;
  brand: string;
  sku: string | null;
  sourceUrl: string;
  supplierCategory: string | null;
  imageUrl: string | null;
  /** The maker and range taken off the front of the title, e.g. "Tupperware® Modular Mates®". */
  productLine: string | null;
  listPrice: number | null;
  listCurrency: string | null;
  /** Colours, sizes or shades offered, when the page lists them. */
  variants: string[];
};

/** First rule whose pattern matches the name or the supplier's own category. */
export function matchCategory(
  haystack: string,
  rules: [RegExp, string][],
  fallback: string
) {
  const text = haystack.toLowerCase();
  for (const [pattern, slug] of rules) if (pattern.test(text)) return slug;
  return fallback;
}
