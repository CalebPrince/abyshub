import "server-only";

/**
 * A fixed-window counter, held in memory.
 *
 * This exists for one reason: the speech endpoint is open to anyone who can
 * load the shop, and every call spends money at ElevenLabs. Without a ceiling,
 * a script pointed at it runs the voice budget to zero in a afternoon and the
 * first anyone hears of it is Lisa going quiet.
 *
 * In memory means per instance, and a serverless deployment may run several —
 * so the real ceiling is this limit times however many instances are warm.
 * That is still a bounded number and still far below what an unthrottled
 * endpoint costs, which is the whole point. A shared counter in Postgres would
 * be exact, at the price of a round trip on the hot path of something whose
 * entire job is to answer quickly; that trade is not worth making until there
 * is evidence the loose bound is being hit.
 *
 * Windows are swept on write rather than by a timer, because a timer would
 * keep the process alive on a platform that bills for it.
 */
type Window = { count: number; expires: number };

const windows = new Map<string, Window>();

/** Stops the map growing without bound when every caller has a fresh IP. */
const MAX_TRACKED = 5000;

export type RateLimitResult = {
  ok: boolean;
  /** Seconds until the window resets, for a Retry-After header. */
  retryAfter: number;
};

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.expires <= now) {
    if (windows.size >= MAX_TRACKED) {
      for (const [k, window] of windows) {
        if (window.expires <= now) windows.delete(k);
      }
      // Still full means every window is live: refuse rather than grow. An
      // attacker rotating addresses fast enough to fill this is exactly who
      // the limit is for.
      if (windows.size >= MAX_TRACKED) return { ok: false, retryAfter: 60 };
    }
    windows.set(key, { count: 1, expires: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  existing.count += 1;
  if (existing.count > limit) {
    return { ok: false, retryAfter: Math.ceil((existing.expires - now) / 1000) };
  }
  return { ok: true, retryAfter: 0 };
}

/**
 * Best-effort caller identity.
 *
 * Behind a proxy the socket address is the proxy, so the forwarded header is
 * the only thing that distinguishes callers. It is also trivially spoofed —
 * which is acceptable here, because the cost of a bypass is one extra bucket,
 * not access to anything.
 */
export function callerKey(request: Request, scope: string): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const real = request.headers.get("x-real-ip")?.trim();
  return `${scope}:${forwarded || real || "unknown"}`;
}
