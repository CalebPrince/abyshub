import type { Metadata } from "next";

import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listOrders } from "@/lib/crm/queries";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Orders" };

const paymentTone: Record<string, string> = {
  paid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  failed: "bg-destructive/10 text-destructive",
  refunded: "bg-muted text-muted-foreground",
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
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Orders
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Written by the Paystack webhook when a charge settles — not when the
        customer returns to the site, so a closed tab still leaves a record.
      </p>

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
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
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
                    <Pill value={order.fulfilment_status} />
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
    </div>
  );
}
