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

export type CustomerRow = {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  order_count: number;
  total_spent: number;
  last_seen_at: string;
  user_id: string | null;
};

export async function listCustomers(limit = 100) {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("customers")
    .select("id, email, name, phone, order_count, total_spent, last_seen_at, user_id")
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as CustomerRow[];
}

export type SettingRow = {
  key: string;
  value: string | null;
  label: string | null;
  group_name: string;
};

/**
 * Public settings, and the *keys* of the secret ones.
 *
 * Secret values are never read here and never reach a page. The settings form
 * shows whether each credential is set, not what it is — an admin session is
 * enough to change a key, but not to read one back out of the database.
 */
export async function listSettings() {
  if (!adminClientAvailable()) {
    return { settings: [] as SettingRow[], secretsSet: [] as string[] };
  }

  const supabase = createAdminClient();
  const [pub, secret] = await Promise.all([
    supabase.from("settings").select("key, value, label, group_name").order("key"),
    // `value` is deliberately absent from this select.
    supabase.from("secure_settings").select("key, value").order("key"),
  ]);

  return {
    settings: (pub.data ?? []) as SettingRow[],
    secretsSet: (secret.data ?? [])
      .filter((row) => Boolean(row.value))
      .map((row) => row.key),
  };
}

export type PageContentRow = {
  id: string;
  page: string;
  key: string;
  value: unknown;
  label: string | null;
};

export async function listPageContent() {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("page_content")
    .select("id, page, key, value, label")
    .order("page")
    .order("key");
  return (data ?? []) as PageContentRow[];
}

export type AdminProductRow = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  price: number;
  compare_at_price: number | null;
  category: string;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
};

export async function listAdminProducts() {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("products")
    .select(
      "id, slug, name, brand, price, compare_at_price, category, in_stock, featured, published"
    )
    .order("sort_order")
    .order("name");
  return (data ?? []) as AdminProductRow[];
}
