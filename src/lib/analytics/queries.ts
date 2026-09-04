import "server-only";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { FUNNEL, type EventName } from "@/lib/analytics/events";

type Row = {
  session_id: string;
  name: EventName;
  path: string | null;
  source: string | null;
  medium: string | null;
  campaign: string | null;
  referrer_host: string | null;
  product_slug: string | null;
  search_term: string | null;
  method: string | null;
  value: number | null;
  created_at: string;
};

export type Report = {
  connected: boolean;
  days: number;
  sessions: number;
  events: number;
  /** Sessions that reached each step, in funnel order. */
  funnel: { label: string; sessions: number; share: number }[];
  sources: { label: string; sessions: number }[];
  products: { slug: string; views: number }[];
  searches: { term: string; count: number; }[];
  methods: { method: string; sessions: number }[];
  /** Where a session's last event landed it. */
  dropOff: { label: string; sessions: number }[];
  revenue: number;
};

const METHOD_LABELS: Record<string, string> = {
  card: "Card or mobile money",
  whatsapp: "WhatsApp",
  enquiry: "Quote request",
};

function tally<T>(items: T[], key: (item: T) => string | null) {
  const counts = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    if (!k) continue;
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

/** Distinct sessions rather than raw hits: one person reloading is one visit. */
function sessionsWith(rows: Row[], predicate: (row: Row) => boolean) {
  return new Set(rows.filter(predicate).map((row) => row.session_id)).size;
}

export async function buildReport(days: number): Promise<Report> {
  const empty: Report = {
    connected: false, days, sessions: 0, events: 0, funnel: [], sources: [],
    products: [], searches: [], methods: [], dropOff: [], revenue: 0,
  };
  if (!adminClientAvailable()) return empty;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await createAdminClient()
    .from("site_events")
    .select(
      "session_id, name, path, source, medium, campaign, referrer_host, product_slug, search_term, method, value, created_at"
    )
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(50000);

  if (error) {
    console.error("[analytics] could not read events:", error.message);
    return { ...empty, connected: true };
  }

  const rows = (data ?? []) as Row[];
  const sessions = new Set(rows.map((row) => row.session_id)).size;

  // The funnel is measured against everyone who arrived, not against the step
  // before, so a shallow step cannot be flattered by a shallow one above it.
  const visited = sessionsWith(rows, () => true) || 1;
  const funnel = FUNNEL.map((step) => {
    const count = sessionsWith(rows, (row) => row.name === step.name);
    return {
      label: step.label,
      sessions: count,
      share: Math.round((count / visited) * 100),
    };
  });

  // One row per session for attribution, so a long visit does not outvote a
  // short one when ranking where people came from.
  const firstBySession = new Map<string, Row>();
  for (const row of rows) {
    if (!firstBySession.has(row.session_id)) firstBySession.set(row.session_id, row);
  }
  const firsts = [...firstBySession.values()];

  const lastBySession = new Map<string, Row>();
  for (const row of rows) lastBySession.set(row.session_id, row);

  const reached = new Map<string, EventName>();
  for (const row of rows) {
    const order = FUNNEL.findIndex((step) => step.name === row.name);
    if (order < 0) continue;
    const current = reached.get(row.session_id);
    const currentOrder = current
      ? FUNNEL.findIndex((step) => step.name === current)
      : -1;
    if (order > currentOrder) reached.set(row.session_id, row.name);
  }

  return {
    connected: true,
    days,
    sessions,
    events: rows.length,
    funnel,
    sources: tally(firsts, (row) =>
      row.campaign
        ? `${row.source ?? "unknown"} / ${row.campaign}`
        : row.source ?? row.referrer_host ?? "direct"
    )
      .slice(0, 10)
      .map(([label, count]) => ({ label, sessions: count })),
    products: tally(
      rows.filter((row) => row.name === "product_view"),
      (row) => row.product_slug
    )
      .slice(0, 10)
      .map(([slug, views]) => ({ slug, views })),
    searches: tally(
      rows.filter((row) => row.name === "search"),
      (row) => (row.search_term ?? "").toLowerCase() || null
    )
      .slice(0, 12)
      .map(([term, count]) => ({ term, count })),
    methods: tally(
      rows.filter((row) => row.name === "checkout_method"),
      (row) => (row.method ? METHOD_LABELS[row.method] ?? row.method : null)
    ).map(([method, count]) => ({ method, sessions: count })),
    dropOff: FUNNEL.map((step) => ({
      label: step.label,
      sessions: [...reached.values()].filter((name) => name === step.name).length,
    })).filter((step) => step.sessions > 0),
    revenue: rows
      .filter((row) => row.name === "purchase")
      .reduce((sum, row) => sum + (row.value ?? 0), 0),
  };
}

export { METHOD_LABELS };
