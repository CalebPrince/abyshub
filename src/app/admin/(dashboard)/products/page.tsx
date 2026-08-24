import type { Metadata } from "next";
import { DownloadIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listAdminProducts } from "@/lib/crm/queries";
import { seedCatalogue, unpublishProduct, updateProduct } from "@/app/admin/data-actions";
import { NewProductForm } from "@/components/admin/new-product-form";
import { getCatalogue } from "@/lib/shop/catalogue";
import { products as fileCatalogue } from "@/lib/products";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Products" };

export default async function AdminProductsPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const [rows, { categories }] = await Promise.all([
    listAdminProducts(),
    getCatalogue(),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Products
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Prices are in minor units — 95000 is GH₵950.00. Saving a change
        updates the shop straight away, including the amount charged at
        checkout.
      </p>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      {rows.length === 0 ? (
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
          <NewProductForm categories={categories} />
        </div>
      ) : (
        <>
          <div className="border-border mt-8 overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[52rem] text-sm">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr className="text-left">
                  <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Product
                  </th>
                  <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Price
                  </th>
                  <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Was
                  </th>
                  <th className="p-3 text-center text-[11px] font-semibold tracking-[0.14em] uppercase">
                    In stock
                  </th>
                  <th className="p-3 text-center text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Listed
                  </th>
                  <th className="p-3 text-center text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Featured
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody className="divide-border divide-y">
                {rows.map((product) => (
                  <tr key={product.id}>
                    {/* One form per row: a single form around the table would
                        submit every product on every save. */}
                    <td className="p-3">
                      <p className="font-medium">{product.name}</p>
                      <p className="text-muted-foreground text-xs">
                        {product.brand} · {product.category}
                      </p>
                    </td>
                    <td className="p-3">
                      <Input
                        form={`p-${product.id}`}
                        name="price"
                        defaultValue={product.price}
                        inputMode="numeric"
                        className="h-9 w-24"
                      />
                    </td>
                    <td className="p-3">
                      <Input
                        form={`p-${product.id}`}
                        name="compare_at_price"
                        defaultValue={product.compare_at_price ?? ""}
                        inputMode="numeric"
                        className="h-9 w-24"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        form={`p-${product.id}`}
                        type="checkbox"
                        name="in_stock"
                        defaultChecked={product.in_stock}
                        className="accent-primary size-4"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        form={`p-${product.id}`}
                        type="checkbox"
                        name="published"
                        defaultChecked={product.published}
                        className="accent-primary size-4"
                      />
                    </td>
                    <td className="p-3 text-center">
                      <input
                        form={`p-${product.id}`}
                        type="checkbox"
                        name="featured"
                        defaultChecked={product.featured}
                        className="accent-primary size-4"
                      />
                    </td>
                    <td className="p-3 text-right">
                      {/* The form element itself lives here; the inputs above
                          join it by id, which keeps the table cells tidy. */}
                      <div className="flex items-center justify-end gap-1.5">
                        <form action={updateProduct} id={`p-${product.id}`}>
                          <input type="hidden" name="id" value={product.id} />
                          <Button type="submit" size="sm" variant="outline">
                            Save
                          </Button>
                        </form>
                        {/* Unlisting rather than deleting: order items keep
                            their own price snapshot, so history survives
                            either way, but a delete also throws away the
                            description and photograph for good. */}
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
          <NewProductForm categories={categories} />
        </>
      )}
    </div>
  );
}
