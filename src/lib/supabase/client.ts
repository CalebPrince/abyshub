"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseEnabled } from "@/lib/supabase/config";

/**
 * Supabase client for the browser.
 *
 * The header needs to know whether someone is signed in. Asking the server
 * would mean touching cookies on every storefront render and dragging the
 * whole shop out of static rendering; reading the session here keeps the pages
 * static and settles the account menu on hydration instead.
 *
 * Only ever the publishable key, and only ever for the customer's own session.
 */
// Typed as SupabaseClient rather than inferred: ReturnType on the generic
// factory collapses to `any`, which silently unties every call site.
let browserClient: SupabaseClient | null = null;

export function createClient() {
  if (!supabaseEnabled) return null;

  // One per tab. A fresh client per render would each start their own token
  // refresh timer and race each other for the same cookie.
  browserClient ??= createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
}
