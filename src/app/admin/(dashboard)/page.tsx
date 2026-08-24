import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { getOverview, listLeads, listOrders } from "@/lib/crm/queries";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const [overview, orders, leads] = await Promise.all([
    getOverview(),
    listOrders(5),
    listLeads(5),
  ]);

  const tiles = [
    { label: "Revenue", value: formatPrice(overview.revenue) },
    { label: "Paid orders", value: String(overview.paidOrders) },
    { label: "Awaiting dispatch", value: String(overview.awaitingDispatch) },
    { label: "Open enquiries", value: String(overview.openLeads) },
    { label: "Customers", value: String(overview.customers) },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Overview
      </h1>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {tiles.map((tile) => (
          <div
            key={tile.label}
            className="border-border bg-card rounded-xl border p-4"
          >
            <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
              {tile.label}
            </p>
            <p className="font-display mt-2 text-2xl font-extrabold tracking-tight">
              {tile.value}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-10 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
              Latest orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
            >
              All orders <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <div className="border-border divide-border divide-y rounded-xl border">
            {orders.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                No orders yet.
              </p>
            ) : (
              orders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between gap-3 p-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">
                      {order.name ?? order.email}
                    </p>
                    <p className="text-muted-foreground truncate font-mono text-xs">
                      {order.reference}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold">
                    {formatPrice(order.total)}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
              Latest enquiries
            </h2>
            <Link
              href="/admin/enquiries"
              className="text-primary flex items-center gap-1 text-sm font-medium hover:underline"
            >
              All enquiries <ArrowRightIcon className="size-3.5" />
            </Link>
          </div>
          <div className="border-border divide-border divide-y rounded-xl border">
            {leads.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                No enquiries yet.
              </p>
            ) : (
              leads.map((lead) => (
                <div key={lead.id} className="p-3">
                  <p className="truncate text-sm font-semibold">{lead.name}</p>
                  <p className="text-muted-foreground line-clamp-1 text-xs">
                    {lead.details}
                  </p>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
