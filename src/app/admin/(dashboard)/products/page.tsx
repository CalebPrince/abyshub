import type { Metadata } from "next";
import { DownloadIcon, PlusIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SetupNotice } from "@/components/admin/setup-notice";
import { ProductDialog } from "@/components/admin/product-dialog";
import { adminClientAvailable, createAdminClient } from "@/lib/supabase/admin";
import { seedCatalogue, unpublishProduct } from "@/app/admin/data-actions";
import { getCatalogue } from "@/lib/shop/catalogue";
import { products as fileCatalogue } from "@/lib/products";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Products" };

type Row = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  tagline: string | null;
  description: string | null;
  highlights: string[] | null;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
};

/**
 * Every field the edit dialog needs, fetched up front. With a catalogue this
 * size that is cheaper than a round trip each time a dialog opens.
 */
async function listRows(): Promise<Row[]> {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, brand, category, price, compare_at_price, tagline, description, highlights, in_stock, featured, published"
    )
    .order("sort_order")
    .order("name");
  return (data ?? []) as Row[];
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

export default async function AdminProductsPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const [rows, { categories }] = await Promise.all([listRows(), getCatalogue()]);

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
          <ProductDialog
            categories={categories}
            trigger={
              <Button>
                <PlusIcon /> Add a product
              </Button>
            }
          />
        ) : null}
      </div>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      {connected && rows.length === 0 ? (
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

      {rows.length > 0 ? (
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
                      <p className="font-medium">{product.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {product.brand} · {product.category}
                      </p>
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

          <form action={seedCatalogue} className="mt-4">
            <Button type="submit" variant="ghost" size="sm">
              <DownloadIcon /> Re-import from code
            </Button>
            <span className="text-muted-foreground ml-2 text-xs">
              Overwrites every row with the values in the code, including any
              price edited here.
            </span>
          </form>
        </>
      ) : null}
    </div>
  );
}
