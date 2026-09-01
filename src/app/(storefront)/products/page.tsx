import * as React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import {
  ProductFilters,
  type SortOption,
} from "@/components/store/product-filters";
import { getCatalogue, categoryFrom, brandsFrom } from "@/lib/shop/catalogue";
import { getPageCopy } from "@/lib/shop/content";
import { matchesQuery } from "@/lib/search";
import type { Product } from "@/lib/types";

const PRODUCTS_PER_PAGE = 20;

/** First and last always, and a step either side of where you are. */
function pageWindow(page: number, pageCount: number) {
  const wanted = [1, page - 1, page, page + 1, pageCount];
  return [...new Set(wanted)]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
}

export const metadata: Metadata = {
  title: "Everything we stock",
  description:
    "Browse genuine Tupperware and Abys Home goods — food storage, kitchen prep, lunch sets, serveware and home care.",
};

/**
 * Whatever else a sort mode compares by, a sold-out item never outranks an
 * available one — with most of the catalogue sitting unconfirmed for Ghana,
 * sorting on price or name alone would bury the handful actually buyable
 * under pages of "Sold out" tiles.
 */
function byAvailability(a: Product, b: Product) {
  return Number(b.inStock) - Number(a.inStock);
}

function sortProducts(list: Product[], sort: SortOption): Product[] {
  const sorted = [...list];

  switch (sort) {
    case "price-asc":
      return sorted.sort((a, b) => byAvailability(a, b) || a.price - b.price);
    case "price-desc":
      return sorted.sort((a, b) => byAvailability(a, b) || b.price - a.price);
    case "rating":
      return sorted.sort((a, b) => byAvailability(a, b) || b.rating - a.rating);
    case "name":
      return sorted.sort(
        (a, b) => byAvailability(a, b) || a.name.localeCompare(b.name)
      );
    case "featured":
    default:
      return sorted.sort(
        (a, b) =>
          byAvailability(a, b) ||
          Number(Boolean(b.featured)) - Number(Boolean(a.featured))
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
  // "Discounted Items" in the menu: anything currently below its usual price.
  const saleOnly = params.sale === "1";

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
  if (saleOnly) {
    results = results.filter(
      (product) =>
        product.compareAtPrice !== undefined &&
        product.compareAtPrice > product.price
    );
  }
  if (queryParam) {
    results = results.filter((product) => matchesQuery(product, queryParam));
  }
  results = sortProducts(results, sortParam as SortOption);

  // With a brand chosen, the shelves offered are only the ones that brand
  // actually stocks — otherwise the filters advertise combinations that lead
  // to an empty page. The shelf already selected stays listed regardless, so
  // it never vanishes out from under whoever picked it.
  const brandShelves = brandParam
    ? new Set(
        products
          .filter((product) => product.brand === brandParam)
          .map((product) => product.category)
      )
    : null;
  const visibleCategories = brandShelves
    ? categories.filter(
        (item) => brandShelves.has(item.slug) || item.slug === categoryParam
      )
    : categories;

  const requestedPage = Number(
    typeof params.page === "string" ? params.page : params.page?.[0]
  );
  const pageCount = Math.max(1, Math.ceil(results.length / PRODUCTS_PER_PAGE));
  const page = Number.isFinite(requestedPage) && requestedPage >= 1
    ? Math.min(Math.floor(requestedPage), pageCount)
    : 1;
  const firstResult = (page - 1) * PRODUCTS_PER_PAGE;
  const visibleResults = results.slice(firstResult, firstResult + PRODUCTS_PER_PAGE);

  function pageHref(nextPage: number) {
    const nextParams = new URLSearchParams();
    if (categoryParam) nextParams.set("category", categoryParam);
    if (brandParam) nextParams.set("brand", brandParam);
    if (saleOnly) nextParams.set("sale", "1");
    if (sortParam !== "featured") nextParams.set("sort", sortParam);
    if (queryParam) nextParams.set("q", queryParam);
    if (nextPage > 1) nextParams.set("page", String(nextPage));
    const query = nextParams.toString();
    return query ? `/products?${query}` : "/products";
  }

  const heading = saleOnly
    ? "Discounted Items"
    : category
      ? category.name
      : brandParam
        ? brandParam
        : "Everything";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-12 lg:px-8 lg:py-16">
      <Reveal>
        <header className="border-foreground/12 border-b pb-10">
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            {saleOnly ? "On offer" : category ? "Shelf" : brandParam ? "Brand" : "The shop"}
          </p>
          <h1 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-6xl">
            {heading}
          </h1>
          <p className="text-muted-foreground mt-4 max-w-xl">
            {saleOnly
              ? "Everything currently selling below its usual price."
              : category
              ? category.description
              : brandParam
                ? `Everything we stock from ${brandParam}.`
                : copy(
                    "body",
                    "Genuine Tupperware alongside our own home range. Fourteen things worth owning."
                  )}
          </p>
        </header>
      </Reveal>

      <div className="py-8">
        <React.Suspense fallback={<Skeleton className="h-28 w-full" />}>
          <ProductFilters
            resultCount={results.length}
            categories={visibleCategories}
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
          {visibleResults.map((product, index) => (
            <Reveal key={product.id} delay={(index % 4) * 60} className="h-full">
              <ProductCard product={product} className="h-full" />
            </Reveal>
          ))}
        </div>
      )}

      {pageCount > 1 ? (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <p className="text-muted-foreground text-xs">
            Showing {firstResult + 1}–{Math.min(firstResult + PRODUCTS_PER_PAGE, results.length)} of {results.length}
          </p>
          <nav aria-label="Product pages" className="flex items-center gap-1">
            <Button
              asChild={page > 1}
              size="sm"
              variant="ghost"
              disabled={page === 1}
              aria-label="Previous page"
            >
              {page > 1 ? (
                <Link href={pageHref(page - 1)}>
                  <ChevronLeftIcon />
                </Link>
              ) : (
                <span><ChevronLeftIcon /></span>
              )}
            </Button>
            {pageWindow(page, pageCount).map((number, index, shown) => (
              <span key={number} className="flex items-center gap-1">
                {/* A gap in the run means pages were left out. */}
                {index > 0 && number - shown[index - 1] > 1 ? (
                  <span className="text-muted-foreground px-1 text-xs">…</span>
                ) : null}
                <Button
                  asChild={number !== page}
                  size="sm"
                  variant={number === page ? "default" : "ghost"}
                  className="w-9 tabular-nums"
                  aria-current={number === page ? "page" : undefined}
                >
                  {number === page ? (
                    <span>{number}</span>
                  ) : (
                    <Link href={pageHref(number)}>{number}</Link>
                  )}
                </Button>
              </span>
            ))}
            <Button
              asChild={page < pageCount}
              size="sm"
              variant="ghost"
              disabled={page === pageCount}
              aria-label="Next page"
            >
              {page < pageCount ? (
                <Link href={pageHref(page + 1)}>
                  <ChevronRightIcon />
                </Link>
              ) : (
                <span><ChevronRightIcon /></span>
              )}
            </Button>
          </nav>
        </div>
      ) : null}
    </div>
  );
}
