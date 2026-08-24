import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Customers" };

/**
 * Placeholder. The schema for this section already exists in
 * supabase/migrations/20260824000000_crm_foundation.sql — only the screen is outstanding,
 * which is why the nav links here rather than hiding the section.
 */
export default async function AdminCustomersPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Customers
      </h1>
      <div className="border-border bg-muted/40 mt-8 rounded-xl border border-dashed p-6">
        <p className="font-semibold">Not built yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Every buyer and enquirer, with their orders and history in one place.
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          The tables are already in the migration, so nothing here needs a
          schema change — just the screen.
        </p>
      </div>
    </div>
  );
}
