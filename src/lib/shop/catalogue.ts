import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import {
  categories as fileCategories,
  products as fileProducts,
} from "@/lib/products";
import { plainText } from "@/lib/shop/plain-text";
import type { Category, Product } from "@/lib/types";

export const CATALOGUE_TAG = "catalogue";

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  product_line: string | null;
  tagline: string | null;
  description: string | null;
  price: number;
  compare_at_price: number | null;
  category: string;
  categories: string[] | null;
  image: string | null;
  images: string[] | null;
  rating: number | null;
  review_count: number | null;
  in_stock: boolean;
  stock_quantity: number;
  featured: boolean;
  highlights: string[] | null;
  variants: string[] | null;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: plainText(row.name),
    brand: row.brand,
    productLine: row.product_line ? plainText(row.product_line) : undefined,
    tagline: plainText(row.tagline),
    description: plainText(row.description),
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    category: row.category,
    categories: row.categories ?? [],
    image: row.image ?? "",
    images: row.images ?? [],
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    inStock: row.in_stock,
    stockQuantity: row.stock_quantity,
    featured: row.featured,
    highlights: (row.highlights ?? []).map(plainText),
    variants: row.variants ?? [],
  };
}

/**
 * The catalogue the whole shop runs on.
 *
 * The hardcoded list in lib/products.ts is a development convenience and
 * nothing more. Where a database is configured, a failure to read it returns
 * an empty catalogue rather than those products: this shop takes real money,
 * and serving invented prices and stock levels under the banner "genuine
 * stock" is worse in every way than admitting the shelf cannot be read. A
 * silent substitution also hides the outage, which is how the same fault has
 * survived a deploy more than once.
 *
 * Cached and tagged rather than fetched per request, so the storefront can
 * still be rendered statically. Product mutations invalidate CATALOGUE_TAG,
 * so unchanged catalogue pages never regenerate on a timer. The TTL is a
 * backstop for the case the tag cannot cover: a read that failed is cached
 * like any other result, and without an expiry one bad moment during a build
 * outlives the problem that caused it.
 */
/** Long enough to stay effectively static, short enough that a failed read heals itself. */
const CATALOGUE_TTL_SECONDS = 300;

export type Catalogue = {
  products: Product[];
  categories: Category[];
  /** True when the database should have answered and did not. */
  degraded: boolean;
};

export const getCatalogue = unstable_cache(
  async (): Promise<Catalogue> => {
    if (!adminClientAvailable()) {
      // No database configured. On a developer's machine that is the normal
      // way to run the shop; in production it is a broken deploy, and the
      // hardcoded list would paper over it.
      if (process.env.NODE_ENV === "production") {
        console.error(
          "[catalogue] Supabase is not configured in production - serving an empty catalogue. Check SUPABASE_SERVICE_ROLE_KEY is set for this environment."
        );
        return { products: [], categories: [], degraded: true };
      }
      return { products: fileProducts, categories: fileCategories, degraded: false };
    }

    const supabase = createAdminClient();

    // Supabase has intermittently rejected the service key during a build
    // with "JWT issued at future" — a clock-skew hiccup on their end that
    // clears itself within a second or two. Retrying here is the difference
    // between that one bad moment and a static homepage stuck on the
    // fallback catalogue until the next deploy.
    async function fetchCatalogue(attempt = 1) {
      const result = await Promise.all([
        supabase
          .from("products")
          .select(
            "id, slug, name, brand, product_line, tagline, description, price, compare_at_price, category, categories, image, images, rating, review_count, in_stock, stock_quantity, featured, highlights, variants"
          )
          .eq("published", true)
          .order("sort_order"),
        supabase
          .from("categories")
          .select("slug, name, description, gradient")
          .order("sort_order"),
      ]);

      const [productResult, categoryResult] = result;
      // The same auth hiccup can hit either query independently, so either
      // one erroring is worth a retry — not just the products half.
      if ((productResult.error || categoryResult.error) && attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        return fetchCatalogue(attempt + 1);
      }
      return result;
    }

    const [productResult, categoryResult] = await fetchCatalogue();

    if (productResult.error) {
      console.error(
        "[catalogue] failed to read products from Supabase - serving an empty catalogue rather than the hardcoded list:",
        productResult.error.message
      );
    }
    if (categoryResult.error) {
      console.error(
        "[catalogue] failed to read categories from Supabase:",
        categoryResult.error.message
      );
    }

    const rows = (productResult.data ?? []) as ProductRow[];
    const categoryRows = categoryResult.data ?? [];

    return {
      products: rows.map(toProduct),
      categories: categoryRows.map((row) => ({
        slug: row.slug,
        name: plainText(row.name),
        description: plainText(row.description),
        gradient: row.gradient ?? "",
      })),
      // An empty shelf is only a fault if the query failed. A shop with
      // nothing published yet is empty on purpose.
      degraded: Boolean(productResult.error || categoryResult.error),
    };
  },
  ["shop-catalogue"],
  { tags: [CATALOGUE_TAG], revalidate: CATALOGUE_TTL_SECONDS }
);

export async function getProducts() {
  return (await getCatalogue()).products;
}

export async function getCategories() {
  return (await getCatalogue()).categories;
}

export async function findProductBySlug(slug: string) {
  return (await getProducts()).find((product) => product.slug === slug) ?? null;
}

/**
 * The helpers in lib/products.ts operate on the hardcoded array. These are the
 * same shapes against whatever catalogue is actually in force, so a page can
 * ask for featured or related items without caring where the rows came from.
 *
 * Never surfaces something sold out — a "moving fast" shelf that links to a
 * sold-out product undoes the whole point of tracking stock. Featured items
 * lead, and anything still available fills the rest at random so the section
 * is never half empty while most of the catalogue sits unconfirmed for Ghana.
 */
export function featuredFrom(products: Product[], limit = 6) {
  const available = products.filter((product) => product.inStock);
  const featured = available.filter((product) => product.featured);
  if (featured.length >= limit) return featured.slice(0, limit);

  const rest = available.filter((product) => !product.featured);
  const filler = [...rest].sort(() => Math.random() - 0.5);
  return [...featured, ...filler].slice(0, limit);
}

/**
 * Stays inside the brand. With several ranges in the catalogue, matching on
 * shelf alone puts Oriflame under a Tupperware product, which reads as the
 * wrong shop rather than a suggestion. Same shelf leads; the rest of the
 * brand fills any gap, and nothing outside it is offered.
 */
export function relatedFrom(products: Product[], product: Product, limit = 4) {
  const sameBrand = products.filter(
    (item) => item.id !== product.id && item.brand === product.brand
  );
  const sameShelf = sameBrand.filter((item) => item.category === product.category);
  if (sameShelf.length >= limit) return sameShelf.slice(0, limit);

  const rest = sameBrand.filter((item) => item.category !== product.category);
  return [...sameShelf, ...rest].slice(0, limit);
}

export function brandsFrom(products: Product[]) {
  return [...new Set(products.map((product) => product.brand))].sort();
}

/**
 * A product sits on its primary shelf plus any extra it has been given, so a
 * shelf listing has to ask rather than compare: matching on `category` alone
 * would hide a product filed somewhere else first.
 */
export function inCategory(product: Product, slug: string) {
  return product.category === slug || (product.categories ?? []).includes(slug);
}

export function categoryFrom(categories: Category[], slug: string) {
  return categories.find((category) => category.slug === slug);
}
