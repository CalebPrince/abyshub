"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { supabaseEnabled } from "@/lib/supabase/config";

export type SignInState = { error: string | null };

function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Signs a member of staff in.
 *
 * Server Actions *can* write cookies, which is why sign-in lives here rather
 * than in a Server Component — `supabase.auth` needs to persist the session.
 *
 * Note what is deliberately not done: the error message never distinguishes
 * "no such user" from "wrong password" from "not staff". Telling an attacker
 * which of those it was hands them a way to enumerate accounts.
 */
export async function signIn(
  _previous: SignInState,
  formData: FormData
): Promise<SignInState> {
  if (!supabaseEnabled || !adminClientAvailable()) {
    return {
      error:
        "Supabase is not configured yet. Add the project keys and redeploy before signing in.",
    };
  }

  const email = field(formData, "email");
  const password = field(formData, "password");
  const next = field(formData, "next");

  if (!email || !password) {
    return { error: "Enter your email and password." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return { error: "Those details were not recognised." };
  }

  // Authenticating is not the same as being staff. Anyone with a Supabase
  // account for this project passes the step above; only a row in admin_users
  // gets them any further.
  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!staff) {
    await supabase.auth.signOut();
    return { error: "Those details were not recognised." };
  }

  // Only ever redirect somewhere inside the admin. A `next` of
  // "https://evil.example" would otherwise turn the login into an open
  // redirect that borrows this site's credibility.
  const target = next.startsWith("/admin") ? next : "/admin";
  redirect(target);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
