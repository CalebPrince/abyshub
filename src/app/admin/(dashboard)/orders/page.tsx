import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon } from "lucide-react";

import { SetupNotice } from "@/components/admin/setup-notice";
import { RecoverOrderForm } from "@/components/admin/recover-order-form";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listOrders } from "@/lib/crm/queries";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";
import { setFulfilmentStatus } from "@/app/admin/data-actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Orders" };

const FULFILMENT = ["new", "packing", "dispatched", "delivered", "cancelled"];

const paymentTone: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
};

const channelTone: Record<string, string> = {
  card: "bg-muted text-muted-foreground",
  whatsapp: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  manual: "bg-muted text-muted-foreground",
};

function Pill({ value, tone }: { value: string; tone?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${tone ?? "bg-muted text-muted-foreground"}`}
    >
      {value}
    </span>
  );
}

export default async function AdminOrdersPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const orders = await listOrders(100);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            Back office
          </p>
          <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
            Orders
          </h1>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm">
            Card orders are written by the Paystack webhook when a charge
            settles — not when the customer returns to the site, so a closed
            tab still leaves a record. WhatsApp orders are recorded the
            moment staff build them, as pending until paid.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/admin/orders/new">
            <PlusIcon /> New WhatsApp order
          </Link>
        </Button>
      </div>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      {/* The table scrolls inside its own box rather than pushing the page
          sideways on a phone. */}
      <div className="border-border mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[46rem] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Reference
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Customer
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Payment
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Channel
              </th>
              <th className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase">
                Fulfilment
              </th>
              <th className="p-3 text-right text-[11px] font-semibold tracking-[0.14em] uppercase">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-muted-foreground p-6 text-center">
                  No orders yet.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id}>
                  <td className="p-3 font-mono text-xs">{order.reference}</td>
                  <td className="p-3">
                    <p className="font-medium">{order.name ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">{order.email}</p>
                  </td>
                  <td className="p-3">
                    <Pill
                      value={order.payment_status}
                      tone={paymentTone[order.payment_status]}
                    />
                  </td>
                  <td className="p-3">
                    <Pill value={order.channel} tone={channelTone[order.channel]} />
                  </td>
                  <td className="p-3">
                    {/* A native select rather than a styled dropdown: it needs
                        to submit inside a form, and this works without JS. */}
                    <form
                      action={setFulfilmentStatus}
                      className="flex items-center gap-1.5"
                    >
                      <input type="hidden" name="id" value={order.id} />
                      <select
                        name="status"
                        defaultValue={order.fulfilment_status}
                        aria-label={`Fulfilment status for ${order.reference}`}
                        className="border-input bg-background h-8 rounded-md border px-2 text-xs capitalize"
                      >
                        {FULFILMENT.map((value) => (
                          <option key={value} value={value}>
                            {value}
                          </option>
                        ))}
                      </select>
                      <Button type="submit" size="sm" variant="outline" className="h-8">
                        Set
                      </Button>
                    </form>
                  </td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(order.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {connected ? <RecoverOrderForm /> : null}
    </div>
  );
}
