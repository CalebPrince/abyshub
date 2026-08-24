import "server-only";

import { createClient } from "@supabase/supabase-js";

import { SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Service-role client. Bypasses RLS entirely, so it is the only thing that can
 * read `secure_settings` or write orders from the Paystack webhook, where
 * there is no signed-in user to authorise against.
 *
 * `server-only` at the top of this file is load-bearing: importing it from a
 * Client Component is a build error rather than a leaked master key.
 *
 * Never pass this client, or anything it returns from `secure_settings`, into
 * a Client Component's props.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!SUPABASE_URL || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL must be set for admin database access."
    );
  }

  return createClient(SUPABASE_URL, key, {
    auth: {
      // No cookies, no refresh: this client is not a user session and must not
      // pick one up from the surrounding request.
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Whether service-role access is configured, for callers that must degrade. */
export function adminClientAvailable() {
  return Boolean(SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim());
}
