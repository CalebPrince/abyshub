/**
 * Supabase connection details.
 *
 * Blank-as-unset, for the same reason lib/config.ts does it: a variable
 * declared in the Vercel dashboard but left empty arrives as "", and `??`
 * would pass it straight through — which is exactly what broke the build once
 * already. Here it would surface as an unauthenticated client rather than a
 * crash, which is worse, so it is checked explicitly.
 *
 * The reads are written out in full because Next only inlines that exact
 * expression; a dynamic lookup would not be replaced at build time.
 */
function required(value: string | undefined, name: string, fallback = "") {
  const trimmed = value?.trim();
  if (trimmed) return trimmed;

  // A missing key must never fail the build the way `new URL("")` did — the
  // storefront has to keep working with the catalogue it already ships.
  if (process.env.NODE_ENV !== "production") {
    console.warn(`[supabase] ${name} is not set — CRM features are disabled.`);
  }
  return fallback;
}

export const SUPABASE_URL = required(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL"
);

export const SUPABASE_ANON_KEY = required(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);

/**
 * True once both public values are present. Guard anything that talks to
 * Supabase with this, so the shop still renders from lib/products.ts before
 * the database exists.
 */
export const supabaseEnabled = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
