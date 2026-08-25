import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import {
  categories as fileCategories,
  products as fileProducts,
} from "@/lib/products";
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
  image: string | null;
  rating: number | null;
  review_count: number | null;
  in_stock: boolean;
  featured: boolean;
  highlights: string[] | null;
  variants: string[] | null;
};

function toProduct(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    brand: row.brand,
    productLine: row.product_line ?? undefined,
    tagline: row.tagline ?? "",
    description: row.description ?? "",
    price: row.price,
    compareAtPrice: row.compare_at_price ?? undefined,
    category: row.category,
    image: row.image ?? "",
    rating: Number(row.rating ?? 0),
    reviewCount: row.review_count ?? 0,
    inStock: row.in_stock,
    featured: row.featured,
    highlights: row.highlights ?? [],
    variants: row.variants ?? [],
  };
}

/**
 * The catalogue the whole shop runs on.
 *
 * Reads the database, and falls back to lib/products.ts when the table is
 * empty or Supabase is unreachable. The fallback is not politeness: without it
 * a database hiccup would empty the shop, and an unseeded install would show
 * nothing at all.
 *
 * Cached and tagged rather than fetched per request, so the storefront can
 * still be rendered statically. Editing a product in the admin calls
 * revalidateTag(CATALOGUE_TAG), which is what makes a price change appear
 * without waiting for the revalidate window.
 */
export const getCatalogue = unstable_cache(
  async (): Promise<{ products: Product[]; categories: Category[] }> => {
    if (!adminClientAvailable()) {
      return { products: fileProducts, categories: fileCategories };
    }

    const supabase = createAdminClient();
    const [productResult, categoryResult] = await Promise.all([
      supabase
        .from("products")
        .select(
          "id, slug, name, brand, product_line, tagline, description, price, compare_at_price, category, image, rating, review_count, in_stock, featured, highlights, variants"
        )
        .eq("published", true)
        .order("sort_order"),
      supabase
        .from("categories")
        .select("slug, name, description, gradient")
        .order("sort_order"),
    ]);

    if (productResult.error) {
      console.error("[catalogue] failed to read products from Supabase, falling back to lib/products.ts:", productResult.error.message);
    }
    if (categoryResult.error) {
      console.error("[catalogue] failed to read categories from Supabase:", categoryResult.error.message);
    }

    const rows = (productResult.data ?? []) as ProductRow[];
    if (rows.length === 0) {
      return { products: fileProducts, categories: fileCategories };
    }

    const categoryRows = categoryResult.data ?? [];

    return {
      products: rows.map(toProduct),
      categories:
        categoryRows.length > 0
          ? categoryRows.map((row) => ({
              slug: row.slug,
              name: row.name,
              description: row.description ?? "",
              gradient: row.gradient ?? "",
            }))
          : fileCategories,
    };
  },
  ["shop-catalogue"],
  { tags: [CATALOGUE_TAG], revalidate: 300 }
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
 */
export function featuredFrom(products: Product[], limit = 6) {
  const featured = products.filter((product) => product.featured);

  // A freshly imported catalogue has no featured flags. Keep the homepage
  // useful until staff curate it by falling back to the strongest in-stock
  // products instead of rendering an empty section.
  const candidates = featured.length > 0
    ? featured
    : products
        .filter((product) => product.inStock)
        .toSorted(
          (a, b) =>
            b.rating - a.rating || b.reviewCount - a.reviewCount
        );

  return candidates.slice(0, limit);
}

export function relatedFrom(products: Product[], product: Product, limit = 4) {
  return products
    .filter((item) => item.id !== product.id && item.category === product.category)
    .slice(0, limit);
}

export function brandsFrom(products: Product[]) {
  return [...new Set(products.map((product) => product.brand))].sort();
}

export function categoryFrom(categories: Category[], slug: string) {
  return categories.find((category) => category.slug === slug);
}
