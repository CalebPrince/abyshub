import type { Metadata } from "next";
import Link from "next/link";

import { SetupNotice } from "@/components/admin/setup-notice";
import { buildReport } from "@/lib/analytics/queries";
import { formatPrice } from "@/lib/money";
import { requireAdmin } from "@/lib/admin/dal";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Analytics" };

const RANGES = [7, 30, 90] as const;

export default async function AdminAnalyticsPage({
  searchParams,
}: PageProps<"/admin/analytics">) {
  await requireAdmin();

  const params = await searchParams;
  const requested = Number(typeof params.days === "string" ? params.days : 30);
  const days = RANGES.includes(requested as (typeof RANGES)[number]) ? requested : 30;

  const report = await buildReport(days);
  const paid = report.funnel.find((step) => step.label === "Paid");

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
        Back office
      </p>
      <h1 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase lg:text-4xl">
        Analytics
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-sm">
        Measured on this site, by this site. No third party sees any of it, and
        nothing here identifies a person: a visit is a random id the browser
        keeps for one tab and forgets when it closes.
      </p>

      {!report.connected ? (
        <div className="mt-8">
          <SetupNotice />
        </div>
      ) : null}

      <div className="mt-8 flex gap-2">
        {RANGES.map((range) => (
          <Link
            key={range}
            href={`/admin/analytics?days=${range}`}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-semibold",
              range === days
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border hover:bg-muted"
            )}
          >
            {range} days
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <Stat label="Visits" value={report.sessions.toLocaleString()} />
        <Stat label="Events" value={report.events.toLocaleString()} />
        <Stat
          label="Paid"
          value={paid ? paid.sessions.toLocaleString() : "0"}
        />
        <Stat label="Value paid" value={formatPrice(report.revenue)} />
      </div>

      {report.events === 0 ? (
        <p className="text-muted-foreground border-border mt-8 rounded-xl border border-dashed p-8 text-center text-sm">
          Nothing recorded in this window yet. Events start arriving as soon as
          someone visits the shop.
        </p>
      ) : null}

      <Section title="The funnel" hint="Share of all visits that reached each step.">
        <div className="space-y-2.5">
          {report.funnel.map((step) => (
            <div key={step.label}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{step.label}</span>
                <span className="text-muted-foreground tabular-nums">
                  {step.sessions.toLocaleString()} ({step.share}%)
                </span>
              </div>
              <div className="bg-muted mt-1 h-2 overflow-hidden rounded-full">
                <div
                  className="bg-primary h-full rounded-full"
                  style={{ width: `${Math.min(step.share, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </Section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Section
          title="Where they came from"
          hint="Counted once per visit, from its first event."
        >
          <Table
            rows={report.sources.map((s) => [s.label, s.sessions.toLocaleString()])}
            empty="No sources yet."
          />
        </Section>

        <Section title="Where they stopped" hint="The furthest step each visit reached.">
          <Table
            rows={report.dropOff.map((d) => [d.label, d.sessions.toLocaleString()])}
            empty="No visits yet."
          />
        </Section>

        <Section title="Most viewed products">
          <Table
            rows={report.products.map((p) => [p.slug, p.views.toLocaleString()])}
            empty="No product views yet."
          />
        </Section>

        <Section
          title="What they searched for"
          hint="The clearest signal of what the shop is missing."
        >
          <Table
            rows={report.searches.map((s) => [s.term, s.count.toLocaleString()])}
            empty="No searches yet."
          />
        </Section>

        <Section title="How they chose to pay" hint="Counted when the option is picked, not when it completes.">
          <Table
            rows={report.methods.map((m) => [m.method, m.sessions.toLocaleString()])}
            empty="Nobody has reached checkout yet."
          />
        </Section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-border rounded-xl border p-4">
      <p className="text-muted-foreground text-[10px] font-bold tracking-[0.15em] uppercase">
        {label}
      </p>
      <p className="mt-1 text-2xl font-extrabold tabular-nums">{value}</p>
    </div>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
        {title}
      </h2>
      {hint ? <p className="text-muted-foreground mt-1 text-xs">{hint}</p> : null}
      <div className="border-border mt-3 rounded-xl border p-4">{children}</div>
    </section>
  );
}

function Table({ rows, empty }: { rows: string[][]; empty: string }) {
  if (rows.length === 0) {
    return <p className="text-muted-foreground py-2 text-sm">{empty}</p>;
  }
  return (
    <ul className="divide-border divide-y text-sm">
      {rows.map(([label, value]) => (
        <li key={label} className="flex items-center justify-between gap-4 py-2">
          <span className="truncate">{label}</span>
          <span className="text-muted-foreground shrink-0 tabular-nums">{value}</span>
        </li>
      ))}
    </ul>
  );
}
