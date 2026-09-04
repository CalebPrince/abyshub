import { NextResponse, type NextRequest } from "next/server";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { EVENT_NAMES, type EventName } from "@/lib/analytics/events";

/**
 * The storefront's own analytics endpoint.
 *
 * Everything arrives here rather than at a third party, which is what lets the
 * cookie notice keep saying the shop loads no outside trackers. Nothing
 * identifying is accepted: there is no field for a name, an email or an IP,
 * and the session id is a value the browser made up for one tab.
 *
 * Never fails loudly. A visitor is not here to file our telemetry, so a bad
 * row is dropped and the page carries on.
 */
const MAX = { text: 300, term: 120 };

function clean(value: unknown, limit: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, limit);
  return trimmed || null;
}

/** Host only. A full referrer can carry a search query or a private path. */
function referrerHost(value: unknown): string | null {
  const raw = clean(value, MAX.text);
  if (!raw) return null;
  try {
    return new URL(raw).hostname.replace(/^www\./, "").slice(0, 120);
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  if (!adminClientAvailable()) return NextResponse.json({ ok: true });

  let payload: Record<string, unknown>;
  try {
    payload = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const name = payload.name;
  if (typeof name !== "string" || !EVENT_NAMES.includes(name as EventName)) {
    return NextResponse.json({ ok: true });
  }

  const sessionId = clean(payload.sessionId, 64);
  if (!sessionId) return NextResponse.json({ ok: true });

  const rawValue = Number(payload.value);
  const value =
    Number.isFinite(rawValue) && rawValue >= 0 ? Math.round(rawValue) : null;

  const { error } = await createAdminClient()
    .from("site_events")
    .insert({
      session_id: sessionId,
      name,
      path: clean(payload.path, MAX.text),
      source: clean(payload.source, 120),
      medium: clean(payload.medium, 120),
      campaign: clean(payload.campaign, 120),
      referrer_host: referrerHost(payload.referrer),
      product_slug: clean(payload.productSlug, 200),
      search_term: clean(payload.searchTerm, MAX.term),
      method: clean(payload.method, 40),
      value,
    });

  if (error) console.error("[events] could not record:", error.message);

  // Always ok: the browser has nothing useful to do with a failure here.
  return NextResponse.json({ ok: true });
}
