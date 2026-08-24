import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

export type AdminUser = {
  id: string;
  email: string;
  fullName: string | null;
  role: "owner" | "staff";
};

/**
 * The single place that answers "is this request from a member of staff".
 *
 * Two separate questions, deliberately: Supabase Auth says whether they are a
 * real signed-in user, and the `admin_users` table says whether that user is
 * allowed in here. Someone who signs up through Supabase but has no row is
 * authenticated and still refused.
 *
 * `cache()` memoises this for the duration of one render pass, so a layout and
 * five components asking the same question cost one round trip.
 *
 * The proxy redirect is a convenience for the browser. This is the check that
 * actually protects the data, and it runs next to every read.
 */
export const getAdminUser = cache(async (): Promise<AdminUser | null> => {
  if (!supabaseEnabled || !adminClientAvailable()) return null;

  const supabase = await createClient();

  // getUser, not getSession: getSession trusts whatever is in the cookie,
  // while getUser revalidates it against Supabase. For an admin gate the
  // extra round trip is the correct trade.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  // Read the allow-list through the service role. Doing it with the user's own
  // client would work via RLS, but this keeps the answer independent of
  // whether the policies are correct.
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("admin_users")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!row) return null;

  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    role: row.role,
  };
});

/**
 * Whether the request carries *any* valid Supabase session, staff or not.
 *
 * Needed to tell two different failures apart: a stranger, who should be sent
 * to the login, and someone signed in who simply is not staff — a customer,
 * once customer accounts exist. Sending the latter to the login produces an
 * infinite bounce, because proxy.ts redirects signed-in users off it.
 */
const hasSession = cache(async () => {
  if (!supabaseEnabled) return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
});

/**
 * Same, but for pages and actions that cannot continue without staff. Returns
 * the user or never returns at all.
 */
export async function requireAdmin(): Promise<AdminUser> {
  const user = await getAdminUser();
  if (user) return user;

  // Signed in, but not staff. The login would only throw them back here, so
  // put them somewhere that makes sense instead: the shop.
  if (await hasSession()) redirect("/?admin=denied");

  redirect("/admin/login");
}
