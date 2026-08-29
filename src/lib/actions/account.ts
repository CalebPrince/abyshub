"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { supabaseEnabled } from "@/lib/supabase/config";
import { getShopSettings } from "@/lib/shop/settings";

export type AccountState = { error: string | null; notice: string | null };

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Only ever send someone to a path on this site — never an absolute URL. */
function safeNext(next: string) {
  return next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

function unavailable(): AccountState {
  return {
    error: "Accounts are not available right now. Please try again shortly.",
    notice: null,
  };
}

export async function register(
  _previous: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (!supabaseEnabled) return unavailable();

  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");
  const name = field(formData, "name");

  if (!email.includes("@") || !name) {
    return { error: "Enter your name and a valid email address.", notice: null };
  }
  // Supabase enforces its own minimum; state ours plainly rather than letting
  // the customer discover it from a raw API error.
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters.", notice: null };
  }

  const supabase = await createClient();
  // The shop's origin, not the raw environment variable: an owner who corrects
  // the address in admin Settings expects their emails to follow. Checkout
  // already reads it from here, and the two drifting apart is how confirmation
  // links end up pointing somewhere payments do not.
  const { siteUrl } = await getShopSettings();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: name },
      // Not /account directly: the link arrives with a one-time code that
      // /auth/callback has to trade for a session first.
      emailRedirectTo: `${siteUrl}/auth/callback?next=%2Faccount`,
    },
  });

  if (error) {
    return { error: error.message, notice: null };
  }

  // Supabase returns a user with no session when confirmation is required.
  // That is the expected path here — order history depends on a confirmed
  // address, so an unconfirmed account is deliberately not signed in.
  if (!data.session) {
    return {
      error: null,
      notice: `Check ${email} for a link to confirm your account.`,
    };
  }

  await linkCustomer(data.user?.id, email, name);
  redirect(safeNext(field(formData, "next")));
}

export async function signIn(
  _previous: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (!supabaseEnabled) return unavailable();

  const email = field(formData, "email").toLowerCase();
  const password = field(formData, "password");

  if (!email || !password) {
    return { error: "Enter your email and password.", notice: null };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    // One message for every failure, so the form cannot be used to discover
    // which email addresses have accounts.
    return { error: "Those details were not recognised.", notice: null };
  }

  await linkCustomer(data.user.id, email, null);
  redirect(safeNext(field(formData, "next")));
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function requestPasswordReset(
  _previous: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (!supabaseEnabled) return unavailable();

  const email = field(formData, "email").toLowerCase();
  if (!email.includes("@")) {
    return { error: "Enter the email address on your account.", notice: null };
  }

  const supabase = await createClient();
  const { siteUrl } = await getShopSettings();

  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/auth/callback?next=%2Faccount%2Freset`,
  });

  // Always the same answer, whether or not the address has an account —
  // otherwise this form tells a stranger who shops here.
  return {
    error: null,
    notice: `If ${email} has an account, a reset link is on its way.`,
  };
}

export async function updatePassword(
  _previous: AccountState,
  formData: FormData
): Promise<AccountState> {
  if (!supabaseEnabled) return unavailable();

  const password = field(formData, "password");
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters.", notice: null };
  }

  const supabase = await createClient();
  // Only works while the recovery link's session is active, which is what
  // makes this safe without asking for the old password.
  const { error } = await supabase.auth.updateUser({ password });

  if (error) return { error: error.message, notice: null };

  redirect("/account");
}

/**
 * Ties the login to a customer record, claiming the one a guest order may
 * already have created under the same address.
 *
 * Uses the service role because a customer has no rights to create their own
 * customers row — the RLS policies let them read and correct one, never insert.
 */
async function linkCustomer(
  userId: string | undefined,
  email: string,
  name: string | null
) {
  if (!userId || !adminClientAvailable()) return;

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("customers")
    .select("id, user_id, name")
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    if (!existing.user_id) {
      await supabase
        .from("customers")
        .update({ user_id: userId, name: name ?? existing.name })
        .eq("id", existing.id);
    }
    return;
  }

  await supabase.from("customers").insert({ email, name, user_id: userId });
}
