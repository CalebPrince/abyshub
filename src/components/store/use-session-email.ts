"use client";

import * as React from "react";

import { createClient } from "@/lib/supabase/client";

/**
 * The signed-in address, or null.
 *
 * Read in the browser rather than on the server: the shop's pages are
 * statically rendered, and asking Supabase who this is on every render would
 * end that for the sake of a menu. Callers therefore start in their signed-out
 * shape and settle on hydration.
 *
 * Nothing built on this is a security boundary. Everything behind an account
 * link checks the session again on the server, and the row-level policies mean
 * a customer only ever gets their own data back regardless of what the browser
 * believes.
 */
export function useSessionEmail() {
  const [email, setEmail] = React.useState<string | null>(null);

  React.useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    let active = true;

    supabase.auth.getUser().then(({ data }) => {
      if (active) setEmail(data.user?.email ?? null);
    });

    // Keeps it honest when the session changes in another tab, or when a token
    // refresh fails and drops them out.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return email;
}
