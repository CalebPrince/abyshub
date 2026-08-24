import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import {
  ProductFilters,
  type SortOption,
} from "@/components/store/product-filters";
import { getCatalogue, categoryFrom, brandsFrom } from "@/lib/shop/catalogue";
import { getPageCopy } from "@/lib/shop/content";
import { matchesQuery } from "@/lib/search";
import type { Product } from "@/lib/types";

export const metadata: Metadata = {
  title: "Everything we stock",
  description:
    "Browse genuine Tupperware and Abys Home goods — food storage, kitchen prep, lunch sets, serveware and home care.",
};

function sortProducts(list: Product[], sort: SortOption): Product[] {
  const sorted = [...list];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => b.rating - a.rating);
    case "name":
      return sorted.sort((a, b) => a.name.localeCompare(b.name));
    case "featured":
    default:
      return sorted.sort(
        (a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured))
      );
  }
}

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const params = await searchParams;

  const categoryParam =
    typeof params.category === "string" ? params.category : undefined;
  const brandParam = typeof params.brand === "string" ? params.brand : undefined;
  const sortParam = typeof params.sort === "string" ? params.sort : "featured";
  const queryParam = typeof params.q === "string" ? params.q.trim() : "";

  const [{ products, categories }, copy] = await Promise.all([
    getCatalogue(),
    getPageCopy("products"),
  ]);
  const category = categoryParam
    ? categoryFrom(categories, categoryParam)
    : undefined;

  let results = products;
  if (category) {
    results = results.filter((product) => product.category === category.slug);
  }
  if (brandParam) {
    results = results.filter((product) => product.brand === brandParam);
  }
  if (queryParam) {
    results = results.filter((product) => matchesQuery(product, queryParam));
  }
  results = sortProducts(results, sortParam as SortOption);

  const heading = category ? category.name : brandParam ? brandParam : "Everything";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <header className="border-foreground/12 border-b pb-10">
        <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
          {category ? "Shelf" : brandParam ? "Brand" : "The shop"}
        </p>
        <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-6xl">
          {heading}
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl">
          {category
            ? category.description
            : brandParam
              ? `Everything we stock from ${brandParam}.`
              : copy(
                  "body",
                  "Genuine Tupperware alongside our own home range. Fourteen things worth owning."
                )}
        </p>
      </header>

      <div className="py-8">
        <React.Suspense fallback={<Skeleton className="h-28 w-full" />}>
          <ProductFilters
            resultCount={results.length}
            categories={categories}
            brands={brandsFrom(products)}
          />
        </React.Suspense>
      </div>

      {results.length === 0 ? (
        <div className="border-foreground/12 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
          <p className="font-display text-xl font-extrabold uppercase">
            Nothing matched
          </p>
          <p className="text-muted-foreground -mt-2 text-sm">
            {queryParam
              ? `We have nothing for “${queryParam}”.`
              : "Try another shelf or brand."}
          </p>
          <Button asChild variant="outline">
            <Link href="/products">Clear filters</Link>
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {results.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
