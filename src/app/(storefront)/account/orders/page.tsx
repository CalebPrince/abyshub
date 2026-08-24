import Link from "next/link";
import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { listMyOrders, requireCustomer } from "@/lib/account/dal";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Your orders" };

export const dynamic = "force-dynamic";

export default async function AccountOrdersPage() {
  await requireCustomer("/account/orders");
  const orders = await listMyOrders(100);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 mb-8 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase lg:text-4xl">
        Your orders
      </h1>

      {orders.length === 0 ? (
        <div className="border-border rounded-xl border p-8 text-center">
          <p className="text-muted-foreground text-sm">
            Nothing here yet. Orders appear once payment settles.
          </p>
          <Button asChild className="mt-4">
            <Link href="/products">Start shopping</Link>
          </Button>
        </div>
      ) : (
        <div className="border-border divide-border divide-y rounded-xl border">
          {orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-mono text-xs">{order.reference}</p>
                <p className="text-muted-foreground text-xs">
                  {new Date(order.created_at).toLocaleDateString()} ·{" "}
                  <span className="capitalize">{order.fulfilment_status}</span>
                </p>
              </div>
              <p className="shrink-0 font-semibold">{formatPrice(order.total)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
