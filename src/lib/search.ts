import { products } from "@/lib/products";
import type { Product } from "@/lib/types";

/**
 * Every term in the query must appear somewhere in the product. Shared by the
 * listing page and the chat assistant so a search means the same thing in both.
 */
export function matchesQuery(product: Product, query: string): boolean {
  const haystack = [
    product.name,
    product.brand,
    product.tagline,
    product.description,
    product.category,
    ...product.highlights,
  ]
    .join(" ")
    .toLowerCase();

  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return false;

  return terms.every((term) => haystack.includes(term));
}

function rank(a: Product, b: Product): number {
  const stock = Number(b.inStock) - Number(a.inStock);
  if (stock !== 0) return stock;
  return Number(Boolean(b.featured)) - Number(Boolean(a.featured));
}

/** Ranks matches so featured, in-stock items surface first. */
export function searchProducts(query: string, limit = 3): Product[] {
  return products
    .filter((product) => matchesQuery(product, query))
    .sort(rank)
    .slice(0, limit);
}

/**
 * "containers" should find the "Round Container Set" — a trailing plural is not
 * a different word. Substring matching already covers the other direction.
 */
function singular(term: string): string {
  if (term.length > 4 && term.endsWith("es")) return term.slice(0, -2);
  if (term.length > 3 && term.endsWith("s")) return term.slice(0, -1);
  return term;
}

/**
 * Matches against product names only, scored by how many terms land.
 *
 * Deliberately narrower than `matchesQuery`: names carry intent ("chopper",
 * "storage"), while descriptions are full of words like "warranty" and
 * "Tupperware" that belong to a topic answer rather than a product listing.
 */
export function findProductsByName(query: string, limit = 3): Product[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];

  const scored = products
    .map((product) => {
      const name = product.name.toLowerCase();
      const score = terms.filter(
        (term) => name.includes(term) || name.includes(singular(term))
      ).length;
      return { product, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || rank(a.product, b.product));

  if (scored.length === 0) return [];

  // Only the best tier: "water jug" names the Water Jug (both terms), so the
  // Eco Water Bottle (one term) is a weaker guess, not a second answer.
  const best = scored[0].score;
  return scored
    .filter((entry) => entry.score === best)
    .slice(0, limit)
    .map((entry) => entry.product);
}
