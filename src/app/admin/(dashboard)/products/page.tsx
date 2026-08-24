import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { ImageOffIcon } from "lucide-react";
import { ChevronLeftIcon, ChevronRightIcon, DownloadIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SetupNotice } from "@/components/admin/setup-notice";
import { ProductDialog } from "@/components/admin/product-dialog";
import { ImportProductDialog } from "@/components/admin/import-product-dialog";
import { DeleteAllProducts } from "@/components/admin/delete-all-products";
import { BulkImportDialog } from "@/components/admin/bulk-import-dialog";
import { adminClientAvailable, createAdminClient } from "@/lib/supabase/admin";
import {
  refreshProduct,
  seedCatalogue,
  unpublishProduct,
} from "@/app/admin/data-actions";
import { supplierById } from "@/lib/suppliers/registry";
import { getCatalogue } from "@/lib/shop/catalogue";
import { products as fileCatalogue } from "@/lib/products";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Products" };

/**
 * A sync chunk fetches four partner pages and four images before it answers.
 * The default timeout is not enough for that, and this applies to every Server
 * Action reached from this page.
 */
export const maxDuration = 60;

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  image: string | null;
  product_line: string | null;
  price: number;
  compare_at_price: number | null;
  tagline: string | null;
  description: string | null;
  highlights: string[] | null;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
  supplier: string | null;
  source_url: string | null;
};

/** Rows to a page. A bulk sync brings in hundreds; a table of 400 is not a list. */
const PER_PAGE = 20;

/**
 * One page of products, with the size of the whole catalogue beside it.
 *
 * Every field the edit dialog needs comes down with the row: for twenty rows
 * that is cheaper than a round trip each time a dialog opens, and the count
 * is asked for in the same query rather than a second one.
 */
async function listRows(page: number): Promise<{ rows: Row[]; total: number }> {
  if (!adminClientAvailable()) return { rows: [], total: 0 };
  const supabase = createAdminClient();

  const from = (page - 1) * PER_PAGE;
  const { data, count } = await supabase
    .from("products")
    .select(
      "id, slug, name, brand, category, image, product_line, price, compare_at_price, tagline, description, highlights, in_stock, featured, published, supplier, source_url",
      { count: "exact" }
    )
    .order("sort_order")
    // Ordering has to be total, not just useful: two rows sharing a
    // sort_order could otherwise swap between pages and one of them would
    // never be seen. Imported rows all have none, so name and then id decide.
    .order("name")
    .order("id")
    .range(from, from + PER_PAGE - 1);

  return { rows: (data ?? []) as Row[], total: count ?? 0 };
}

/** First and last always, and a step either side of where you are. */
function pageWindow(page: number, pageCount: number) {
  const wanted = [1, page - 1, page, page + 1, pageCount];
  return [...new Set(wanted)]
    .filter((n) => n >= 1 && n <= pageCount)
    .sort((a, b) => a - b);
}

function pageHref(page: number) {
  return page <= 1 ? "/admin/products" : `/admin/products?page=${page}`;
}

function Flag({ on, label }: { on: boolean; label: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${
        on
          ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {label}
    </span>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: PageProps<"/admin/products">) {
  const me = await requireAdmin();

  const connected = adminClientAvailable();

  const params = await searchParams;
  const asked = Number(Array.isArray(params.page) ? params.page[0] : params.page);
  const wanted = Number.isFinite(asked) && asked >= 1 ? Math.floor(asked) : 1;

  const [{ rows, total }, { categories }] = await Promise.all([
    listRows(wanted),
    getCatalogue(),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PER_PAGE));
  // A page past the end reads as empty rather than wrong, so say where it is.
  const page = Math.min(wanted, pageCount);
  const firstOnPage = (page - 1) * PER_PAGE + 1;
  const lastOnPage = firstOnPage + rows.length - 1;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            Back office
          </p>
          <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
            Products
          </h1>
          <p className="text-muted-foreground mt-3 text-sm">
            Saving a change updates the shop straight away, including the amount
            charged at checkout.
          </p>
        </div>

        {connected ? (
          <div className="flex flex-wrap gap-2">
            <BulkImportDialog />
            <ImportProductDialog />
            <ProductDialog
              categories={categories}
              trigger={
                <Button>
                  <PlusIcon /> Add a product
                </Button>
              }
            />
          </div>
        ) : null}
      </div>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      {connected && total === 0 ? (
        <div className="border-border mt-8 rounded-xl border p-8 text-center">
          <p className="font-semibold">Nothing imported yet</p>
          <p className="text-muted-foreground mx-auto mt-1 max-w-md text-sm">
            Copy the {fileCatalogue.length} products currently in the code into
            the database, so they can be edited here.
          </p>
          <form action={seedCatalogue} className="mt-4">
            <Button type="submit">
              <DownloadIcon /> Import catalogue from code
            </Button>
          </form>
        </div>
      ) : null}

      {total > 0 ? (
        <>
          <div className="border-border mt-8 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[46rem] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Product
                  </th>
                  <th className="p-3 text-right text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Price
                  </th>
                  <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Status
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((product) => (
                  <tr key={product.id}>
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        {/* Imported pictures live in our own storage, so this
                            is the same file the shop serves, not a hotlink. */}
                        {product.image ? (
                          <Image
                            src={product.image}
                            alt=""
                            width={44}
                            height={44}
                            className="border-border size-11 shrink-0 rounded-md border object-cover"
                          />
                        ) : (
                          <span className="border-border bg-muted text-muted-foreground grid size-11 shrink-0 place-items-center rounded-md border">
                            <ImageOffIcon className="size-4" />
                          </span>
                        )}

                        <div className="min-w-0">
                          {product.product_line ? (
                            <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                              {product.product_line}
                            </p>
                          ) : null}
                          <p className="font-medium">{product.name}</p>
                          <p className="text-muted-foreground text-xs">
                            {product.brand} · {product.category}
                            {product.supplier ? (
                              <>
                                {" · "}
                                <span className="text-primary font-medium">
                                  {supplierById(product.supplier)?.label ??
                                    product.supplier}
                                </span>
                              </>
                            ) : null}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-right whitespace-nowrap">
                      <span className="font-semibold">
                        {formatPrice(product.price)}
                      </span>
                      {product.compare_at_price ? (
                        <span className="text-muted-foreground ml-2 text-xs line-through">
                          {formatPrice(product.compare_at_price)}
                        </span>
                      ) : null}
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        <Flag
                          on={product.published}
                          label={product.published ? "Listed" : "Unlisted"}
                        />
                        <Flag
                          on={product.in_stock}
                          label={product.in_stock ? "In stock" : "Out"}
                        />
                        {product.featured ? <Flag on label="Featured" /> : null}
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <ProductDialog
                          categories={categories}
                          product={product}
                          trigger={
                            <Button size="sm" variant="outline">
                              Edit
                            </Button>
                          }
                        />
                        {product.source_url ? (
                          <form action={refreshProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground"
                              title="Re-pull the partner's words and picture. Your price and listing are untouched."
                            >
                              Refresh
                            </Button>
                          </form>
                        ) : null}
                        {/* Unlist stays beside it: reversible, and nearly
                            always what is actually meant by "remove". */}
                        {product.published ? (
                          <form action={unpublishProduct}>
                            <input type="hidden" name="id" value={product.id} />
                            <Button
                              type="submit"
                              size="sm"
                              variant="ghost"
                              className="text-muted-foreground"
                            >
                              Unlist
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-muted-foreground text-xs">
              Showing {firstOnPage}–{lastOnPage} of {total}
            </p>

            {pageCount > 1 ? (
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
                    <span>
                      <ChevronLeftIcon />
                    </span>
                  )}
                </Button>

                {pageWindow(page, pageCount).map((n, index, shown) => (
                  <span key={n} className="flex items-center gap-1">
                    {/* A gap in the run means pages were left out. */}
                    {index > 0 && n - shown[index - 1] > 1 ? (
                      <span className="text-muted-foreground px-1 text-xs">…</span>
                    ) : null}
                    <Button
                      asChild={n !== page}
                      size="sm"
                      variant={n === page ? "default" : "ghost"}
                      className="w-9 tabular-nums"
                      aria-current={n === page ? "page" : undefined}
                    >
                      {n === page ? <span>{n}</span> : <Link href={pageHref(n)}>{n}</Link>}
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
                    <span>
                      <ChevronRightIcon />
                    </span>
                  )}
                </Button>
              </nav>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <form action={seedCatalogue}>
              <Button type="submit" variant="ghost" size="sm">
                <DownloadIcon /> Re-import from code
              </Button>
              <span className="text-muted-foreground ml-2 text-xs">
                Overwrites every row with the values in the code, including any
                price edited here.
              </span>
            </form>

            {/* Owners only. Staff can edit and unlist; emptying the shop is a
                different order of decision. */}
            {me.role === "owner" ? (
              <DeleteAllProducts count={total} />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}
