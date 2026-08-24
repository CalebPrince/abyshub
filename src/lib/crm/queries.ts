import "server-only";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";

export type OrderRow = {
  id: string;
  reference: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  total: number;
  payment_status: string;
  fulfilment_status: string;
  channel: string;
  created_at: string;
};

export type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  details: string;
  basket_summary: string | null;
  source: string;
  stage: string;
  created_at: string;
};

/**
 * Every read here goes through the service role, and every caller must have
 * passed requireAdmin() first. Keeping the authorisation in the page and the
 * querying here means a new screen cannot accidentally ship unguarded data —
 * it has no client to query with until it asks for one.
 */

export async function listOrders(limit = 50) {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select(
      "id, reference, email, name, phone, city, total, payment_status, fulfilment_status, channel, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as OrderRow[];
}

export async function listLeads(limit = 50) {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("leads")
    .select(
      "id, name, email, phone, details, basket_summary, source, stage, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as LeadRow[];
}

export type Overview = {
  paidOrders: number;
  revenue: number;
  openLeads: number;
  customers: number;
  awaitingDispatch: number;
};

export async function getOverview(): Promise<Overview> {
  if (!adminClientAvailable()) {
    return { paidOrders: 0, revenue: 0, openLeads: 0, customers: 0, awaitingDispatch: 0 };
  }

  const supabase = createAdminClient();

  // `head: true` with an exact count asks Postgres for the number without
  // shipping the rows — these are counters, not lists.
  const [paid, leads, customers, dispatch] = await Promise.all([
    supabase.from("orders").select("total").eq("payment_status", "paid"),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .in("stage", ["new", "contacted", "quoted"]),
    supabase.from("customers").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("payment_status", "paid")
      .in("fulfilment_status", ["new", "packing"]),
  ]);

  const rows = paid.data ?? [];

  return {
    paidOrders: rows.length,
    revenue: rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0),
    openLeads: leads.count ?? 0,
    customers: customers.count ?? 0,
    awaitingDispatch: dispatch.count ?? 0,
  };
}
