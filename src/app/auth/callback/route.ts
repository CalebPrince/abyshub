import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { supabaseEnabled } from "@/lib/supabase/config";

/** Only ever send someone to a path on this site — never an absolute URL. */
function safeNext(next: string | null) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/account";
}

/**
 * Where every emailed auth link lands — confirmation and password recovery
 * both. The link in the email goes to Supabase's own verify endpoint first,
 * which bounces the browser back here carrying a one-time `code`. That code is
 * worth nothing until it is exchanged for a session, and this is the only
 * place that exchange happens.
 *
 * Without it a confirmation link half-works: the address is verified, but the
 * visitor lands signed out, and /account/reset has no recovery session to
 * authorise the new password with.
 *
 * Note that the failure cases redirect with a *code*, not a message. A free
 * text query parameter rendered on the login page would let anyone put their
 * own words above our sign-in form.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const to = (path: string, error?: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = error ? `?error=${error}` : "";
    return NextResponse.redirect(url);
  };

  const code = searchParams.get("code");

  // A refused or stale link comes back as query parameters rather than a body:
  // ?error=access_denied&error_code=otp_expired&…
  if (!code || searchParams.get("error")) {
    return to("/account/login", "expired");
  }

  if (!supabaseEnabled) return to("/account/login", "unavailable");

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    // Much the commonest cause is opening the email on a different device or
    // browser from the one that asked for the link: the PKCE verifier this
    // exchange needs is a cookie, and it stayed behind.
    return to("/account/login", "browser");
  }

  return to(safeNext(searchParams.get("next")));
}
