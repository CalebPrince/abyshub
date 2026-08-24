import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export type Customer = {
  id: string;
  email: string;
  name: string | null;
  emailConfirmed: boolean;
};

/**
 * The signed-in customer, or null.
 *
 * getUser rather than getSession: getSession trusts the cookie as it stands,
 * while getUser revalidates it against Supabase. Memoised per render so a
 * layout and a page asking the same question cost one round trip.
 */
export const getCustomer = cache(async (): Promise<Customer | null> => {
  if (!supabaseEnabled) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;

  return {
    id: user.id,
    email: user.email,
    name: (user.user_metadata?.full_name as string | undefined) ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
});

export async function requireCustomer(next = "/account"): Promise<Customer> {
  const customer = await getCustomer();
  if (!customer) redirect(`/account/login?next=${encodeURIComponent(next)}`);
  return customer;
}

export type CustomerOrder = {
  id: string;
  reference: string;
  total: number;
  payment_status: string;
  fulfilment_status: string;
  created_at: string;
};

/**
 * The customer's orders.
 *
 * Read with their own session client, not the service role, and with no
 * `where` clause naming them. The row-level policy decides what comes back, so
 * a mistake here returns too little rather than someone else's orders — the
 * database is the thing enforcing this, not this function.
 */
export async function listMyOrders(limit = 50): Promise<CustomerOrder[]> {
  if (!supabaseEnabled) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, reference, total, payment_status, fulfilment_status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []) as CustomerOrder[];
}
