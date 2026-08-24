import type { Metadata } from "next";

import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable } from "@/lib/supabase/admin";
import { listLeads } from "@/lib/crm/queries";
import { requireAdmin } from "@/lib/admin/dal";
import { setLeadStage } from "@/app/admin/data-actions";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Enquiries" };

const STAGES = ["new", "contacted", "quoted", "won", "lost"];

const stageTone: Record<string, string> = {
  new: "bg-primary/10 text-primary",
  contacted: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  quoted: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  won: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  lost: "bg-muted text-muted-foreground",
};

export default async function AdminEnquiriesPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const leads = await listLeads(100);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Enquiries
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Quote requests from the enquiry form and handoffs from the chat widget.
      </p>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="mt-8 space-y-3">
        {leads.length === 0 ? (
          <p className="border-border text-muted-foreground rounded-xl border p-6 text-center text-sm">
            No enquiries yet.
          </p>
        ) : (
          leads.map((lead) => (
            <article
              key={lead.id}
              className="border-border bg-card rounded-xl border p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold">{lead.name}</p>
                  <p className="text-muted-foreground text-xs">
                    {[lead.email, lead.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="bg-muted text-muted-foreground inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase">
                    {lead.source}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase ${stageTone[lead.stage] ?? ""}`}
                  >
                    {lead.stage}
                  </span>
                </div>
              </div>

              <p className="mt-3 text-sm whitespace-pre-line">{lead.details}</p>

              {lead.basket_summary ? (
                <p className="text-muted-foreground mt-2 text-xs">
                  Basket: {lead.basket_summary}
                </p>
              ) : null}

              <form
                action={setLeadStage}
                className="mt-3 flex flex-wrap items-center gap-1.5"
              >
                <input type="hidden" name="id" value={lead.id} />
                <select
                  name="stage"
                  defaultValue={lead.stage}
                  aria-label={`Stage for ${lead.name}`}
                  className="border-input bg-background h-8 rounded-md border px-2 text-xs capitalize"
                >
                  {STAGES.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <Button type="submit" size="sm" variant="outline" className="h-8">
                  Move
                </Button>
              </form>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
