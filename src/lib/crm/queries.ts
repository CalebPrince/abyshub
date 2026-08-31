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

export type PaymentRow = {
  id: string;
  reference: string;
  email: string;
  name: string | null;
  total: number;
  currency: string;
  channel: string;
  payment_status: string;
  paid_at: string;
};

/**
 * Settled Paystack transactions, newest first.
 *
 * Filtered on `paid_at` rather than `channel`: a WhatsApp order paid through
 * a Paystack link stays tagged `channel = 'whatsapp'` (see recordPaidOrder),
 * but it is still money Paystack moved, so it belongs here. `paid_at` is only
 * ever set by that same webhook write, which makes it the honest signal for
 * "this actually went through Paystack" regardless of how the order started.
 */
export async function listPayments(limit = 50) {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("orders")
    .select("id, reference, email, name, total, currency, channel, payment_status, paid_at")
    .not("paid_at", "is", null)
    .order("paid_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as PaymentRow[];
}

export type PaymentsSummary = {
  count: number;
  revenue: number;
  averageOrder: number;
};

export async function getPaymentsSummary(): Promise<PaymentsSummary> {
  if (!adminClientAvailable()) return { count: 0, revenue: 0, averageOrder: 0 };

  const supabase = createAdminClient();
  const { data } = await supabase.from("orders").select("total").not("paid_at", "is", null);
  const rows = data ?? [];
  const revenue = rows.reduce((sum, row) => sum + (Number(row.total) || 0), 0);

  return {
    count: rows.length,
    revenue,
    averageOrder: rows.length > 0 ? Math.round(revenue / rows.length) : 0,
  };
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

export type ChatSessionRow = {
  id: string;
  token: string;
  channel: "web" | "whatsapp" | "voice";
  client_name: string | null;
  client_phone: string | null;
  transcript_json: unknown;
  needs_human: boolean;
  created_at: string;
  updated_at: string;
};

/** Private Lisa conversations for the unified staff inbox. */
export async function listChatSessions(limit = 100) {
  if (!adminClientAvailable()) return [];
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("chat_sessions")
    .select(
      "id, token, channel, client_name, client_phone, transcript_json, needs_human, created_at, updated_at"
    )
    .order("updated_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as ChatSessionRow[];
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
