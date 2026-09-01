import type { Metadata } from "next";

import { SetupNotice } from "@/components/admin/setup-notice";
import { adminClientAvailable, createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/admin/dal";

export const metadata: Metadata = { title: "Offer list" };

type Subscriber = {
  id: string;
  email: string;
  source: string;
  created_at: string;
  unsubscribed_at: string | null;
};

async function listSubscribers(): Promise<Subscriber[]> {
  if (!adminClientAvailable()) return [];

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("offer_subscribers")
    .select("id, email, source, created_at, unsubscribed_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    // Almost always the migration not having been run yet. An empty list with
    // a note beats the whole back office falling over.
    console.error("[subscribers] could not read the offer list:", error.message);
    return [];
  }

  return (data ?? []) as Subscriber[];
}

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AdminSubscribersPage() {
  await requireAdmin();

  const connected = adminClientAvailable();
  const subscribers = await listSubscribers();
  const active = subscribers.filter((row) => !row.unsubscribed_at);

  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Offer list
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        Everyone who asked to be sent discount offers. They are kept apart from
        customers on purpose: agreeing to be emailed offers is not the same as
        having bought something, so this list can be exported or pruned without
        touching order history.
      </p>

      {!connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Stat label="On the list" value={active.length} />
        <Stat label="Unsubscribed" value={subscribers.length - active.length} />
      </div>

      {active.length > 0 ? (
        <div className="mt-6">
          <p className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Every address, comma separated
          </p>
          {/* Read-only and selectable: the whole point is to lift these into
              whatever is actually sending the offers. */}
          <textarea
            readOnly
            rows={3}
            value={active.map((row) => row.email).join(", ")}
            className="border-border bg-muted/30 mt-2 w-full resize-y rounded-xl border p-3 font-mono text-xs"
          />
        </div>
      ) : null}

      <div className="border-border mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[34rem] text-sm">
          <thead className="bg-muted/50 text-muted-foreground">
            <tr className="text-left">
              {["Email", "Source", "Signed up", "Status"].map((heading) => (
                <th
                  key={heading}
                  className="p-3 text-[11px] font-semibold tracking-[0.14em] uppercase"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-border divide-y">
            {subscribers.length === 0 ? (
              <tr>
                <td colSpan={4} className="text-muted-foreground p-6 text-center">
                  Nobody has signed up yet.
                </td>
              </tr>
            ) : (
              subscribers.map((row) => (
                <tr key={row.id}>
                  <td className="p-3 font-medium">{row.email}</td>
                  <td className="text-muted-foreground p-3 text-xs">
                    {row.source.replace(/_/g, " ")}
                  </td>
                  <td className="text-muted-foreground p-3 text-xs whitespace-nowrap">
                    {dateFormat.format(new Date(row.created_at))}
                  </td>
                  <td className="p-3">
                    <span
                      className={
                        row.unsubscribed_at
                          ? "bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider uppercase"
                          : "rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold tracking-wider text-emerald-700 uppercase dark:text-emerald-400"
                      }
                    >
                      {row.unsubscribed_at ? "Unsubscribed" : "Subscribed"}
                    </span>
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

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="border-border rounded-xl border px-4 py-3">
      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.15em] uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}
