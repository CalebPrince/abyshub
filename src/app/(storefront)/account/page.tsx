import Link from "next/link";
import type { Metadata } from "next";
import { AlertCircleIcon, ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { listMyOrders, requireCustomer } from "@/lib/account/dal";
import { formatPrice } from "@/lib/money";

export const metadata: Metadata = { title: "Your account" };

// Never cache one customer's account onto a CDN for the next one.
export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const customer = await requireCustomer();
  const orders = await listMyOrders(5);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-16 lg:py-24">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Your account
      </p>
      <h1 className="font-display mt-2 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase lg:text-4xl">
        {customer.name ?? "Hello"}
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">{customer.email}</p>

      {!customer.emailConfirmed ? (
        <div className="border-border bg-muted/40 mt-8 flex items-start gap-3 rounded-xl border border-dashed p-4">
          <AlertCircleIcon className="text-primary mt-0.5 size-5 shrink-0" />
          <div>
            <p className="font-semibold">Confirm your email address</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Check your inbox for the link we sent. Orders you placed as a
              guest only appear here once the address is confirmed, that check
              is what stops someone else claiming your order history.
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-10 flex items-baseline justify-between">
        <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
          Recent orders
        </h2>
        <Link
          href="/account/orders"
          className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
        >
          All orders <ArrowRightIcon className="size-3.5" />
        </Link>
      </div>

      <div className="border-border divide-border mt-3 divide-y rounded-xl border">
        {orders.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-muted-foreground text-sm">No orders yet.</p>
            <Button asChild className="mt-4">
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          orders.map((order) => (
            <div key={order.id} className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-mono text-xs">{order.reference}</p>
                <p className="text-muted-foreground text-xs capitalize">
                  {order.fulfilment_status} · {order.payment_status}
                </p>
              </div>
              <p className="shrink-0 font-semibold">{formatPrice(order.total)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
