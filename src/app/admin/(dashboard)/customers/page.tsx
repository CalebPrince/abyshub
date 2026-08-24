import type { Metadata } from "next";
import { UserCheckIcon } from "lucide-react";

import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listCustomers } from "@/lib/crm/queries";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const customers = await listCustomers();

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Customers
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Built from orders and enquiries. A record appears the first time someone
        buys or asks for a quote, whether or not they ever create an account.
      </p>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="border-border mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[44rem] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              {["Customer", "Contact", "Orders", "Spent", "Last seen"].map(
                (heading, i) => (
                  <th
                    key={heading}
                    className={`p-3 text-[11px] font-semibold tracking-[0.14em] uppercase ${i >= 2 ? "text-right" : ""}`}
                  >
                    {heading}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-muted-foreground p-6 text-center">
                  No customers yet.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id}>
                  <td className="p-3">
                    <p className="flex items-center gap-1.5 font-medium">
                      {customer.name ?? "—"}
                      {/* Distinguishes a registered account from a record that
                          only exists because they once bought something. */}
                      {customer.user_id ? (
                        <UserCheckIcon
                          className="text-primary size-3.5"
                          aria-label="Has an account"
                        />
                      ) : null}
                    </p>
                  </td>
                  <td className="p-3">
                    <p className="text-xs">{customer.email ?? "—"}</p>
                    <p className="text-muted-foreground text-xs">
                      {customer.phone ?? "—"}
                    </p>
                  </td>
                  <td className="p-3 text-right">{customer.order_count}</td>
                  <td className="p-3 text-right font-semibold whitespace-nowrap">
                    {formatPrice(customer.total_spent)}
                  </td>
                  <td className="text-muted-foreground p-3 text-right text-xs whitespace-nowrap">
                    {new Date(customer.last_seen_at).toLocaleDateString()}
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
