import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseEnabled } from "@/lib/supabase/config";

/**
 * `proxy`, not `middleware` — the middleware convention is deprecated in
 * Next 16 and renamed, export and all.
 *
 * This exists for one reason: Server Components cannot write cookies, so
 * something has to run before them to refresh an expiring Supabase session and
 * write the new tokens back. Without it you get the classic symptoms — random
 * logouts and sessions that die early.
 *
 * The redirect below is an *optimistic* check only. It reads the session and
 * nothing else, because proxy runs on every request including prefetches. The
 * real authorisation — is this user actually staff — happens in the admin's
 * data access layer, close to the data. This is a convenience, not a fence.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  // Nothing to refresh before Supabase is configured; let the request through
  // so the storefront keeps working.
  if (!supabaseEnabled) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        // Supabase passes no-store headers alongside refreshed auth cookies.
        // Dropping them lets a CDN cache a response carrying someone's session
        // token and hand it to the next visitor, so they are applied verbatim.
        for (const [key, value] of Object.entries(headers ?? {})) {
          response.headers.set(key, value);
        }
      },
    },
  });

  // Must happen before the response is committed: a refresh that lands after
  // the response has gone out cannot be written to cookies and is lost.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login";

  if (pathname.startsWith("/admin") && !isLogin && !signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    // So the login can send them back where they were headed.
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && signedIn) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  /*
   * Everything except static assets and image files. Auth wants to run broadly
   * so sessions refresh on ordinary navigation, not only inside /admin.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2?)$).*)",
  ],
};
