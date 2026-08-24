import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. A new one per render — never share a client across requests,
 * or one visitor's session leaks into another's.
 *
 * `getAll`/`setAll` rather than the older `get`/`set`/`remove`: the deprecated
 * trio misses edge cases and, per the package's own warning, causes random
 * logouts and early session termination.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. That is expected and
          // harmless *because* proxy.ts refreshes the session on every
          // request — this catch is the documented pattern, not a shrug.
        }
      },
    },
  });
}
