import type { Metadata } from "next";

import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Settings" };

/**
 * Placeholder. The schema for this section already exists in
 * supabase/migrations/0001_crm_foundation.sql — only the screen is outstanding,
 * which is why the nav links here rather than hiding the section.
 */
export default async function AdminSettingsPage() {
  await requireAdmin();

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Settings
      </h1>
      <div className="border-border bg-muted/40 mt-8 rounded-xl border border-dashed p-6">
        <p className="font-semibold">Not built yet</p>
        <p className="text-muted-foreground mt-1 text-sm">
          WhatsApp number, site URL, delivery rates, Paystack and SMTP credentials, editable here instead of as environment variables.
        </p>
        <p className="text-muted-foreground mt-3 text-sm">
          The tables are already in the migration, so nothing here needs a
          schema change — just the screen.
        </p>
      </div>
    </div>
  );
}
