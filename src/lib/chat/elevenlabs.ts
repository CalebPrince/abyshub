import "server-only";

import { getSecret } from "@/lib/shop/settings";

/**
 * ElevenLabs hosts the WhatsApp agent on the shop's Meta Business number and
 * runs the conversation loop on its own servers. These webhooks are what stop
 * that being a second, drifting Lisa: it fetches the live system prompt at the
 * start of every conversation and calls back here for every tool, so a price
 * change reaches WhatsApp the moment it is saved rather than whenever someone
 * remembers to re-paste a prompt into a dashboard.
 */

/** Digits only, no plus, no spaces — how phone numbers are keyed throughout. */
export function normalisePhone(value: string): string {
  return value.replace(/\D/g, "");
}

/** The session token a phone number maps to, shared by all three webhooks. */
export function whatsappToken(digits: string): string {
  return `whatsapp:+${digits}`;
}

/**
 * Every ElevenLabs webhook is a public URL, so each one proves the caller
 * before doing anything.
 *
 * A missing secret refuses the request rather than waving it through: an
 * unconfigured shop should be closed to these endpoints, not open to
 * everyone. Compared in constant time so the check cannot be timed.
 */
export async function verifyElevenLabsSecret(request: Request): Promise<boolean> {
  // Keep both explicitly configured values valid during secret rotation. The
  // admin database normally takes precedence over the environment, but making
  // it replace the environment value here can strand ElevenLabs on a valid
  // deployment secret whenever an older admin value still exists.
  const expected = [
    await getSecret("elevenlabs_webhook_secret"),
    process.env.ELEVENLABS_WEBHOOK_SECRET?.trim() ?? "",
  ].filter((secret, index, secrets) => secret && secrets.indexOf(secret) === index);
  if (expected.length === 0) return false;

  // The query string is not a convenience. ElevenLabs does not reliably send
  // configured custom headers on *tool* calls, so a header-only check makes
  // every tool Lisa has silently unavailable — she keeps talking and simply
  // stops being able to look anything up. Appending `?secret=…` to the tool
  // URL is the documented way round it, and the URL is only ever held by
  // ElevenLabs.
  const received =
    request.headers.get("x-elevenlabs-secret") ??
    request.headers.get("x-webhook-secret") ??
    bearerToken(request.headers.get("authorization")) ??
    new URL(request.url).searchParams.get("secret") ??
    "";
  if (!received) return false;

  const comparisons = await Promise.all(
    expected.map((secret) => constantTimeEqual(secret, received))
  );
  return comparisons.some(Boolean);
}

function bearerToken(value: string | null): string | null {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

/**
 * The post-call webhook, which is signed rather than shared-secreted.
 *
 * ElevenLabs generates this secret itself and signs each request Stripe-style:
 * `ElevenLabs-Signature: t=<unix seconds>,v0=<hex HMAC-SHA256>`, over
 * `<timestamp>.<raw body>`. It does not send the custom header the other two
 * webhooks use, so checking for one here rejects every genuine call — and
 * because this is the only route by which anything said on WhatsApp reaches
 * us, the symptom is not an error but an assistant that is permanently
 * amnesiac between messages.
 *
 * The body must be the raw text, byte for byte. Re-serialising parsed JSON
 * changes whitespace and key order and the signature stops matching.
 */
export async function verifyElevenLabsSignature(
  request: Request,
  rawBody: string
): Promise<boolean> {
  const secret = await getSecret(
    "elevenlabs_postcall_signing_secret",
    process.env.ELEVENLABS_POSTCALL_SIGNING_SECRET
  );
  const header = request.headers.get("elevenlabs-signature")?.trim();
  if (!secret || !header) return false;

  const parts = new Map<string, string>();
  for (const piece of header.split(",")) {
    const [key, value] = piece.split("=", 2);
    if (key && value !== undefined) parts.set(key.trim(), value.trim());
  }

  const timestamp = parts.get("t") ?? "";
  const signature = parts.get("v0") ?? "";
  if (!/^\d+$/.test(timestamp) || !signature) return false;

  // Without this, a signature captured once is valid forever — the signature
  // proves who sent it, the timestamp proves when.
  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (age > 1800) {
    console.error("[lisa] post-call signature outside the 30-minute window");
    return false;
  }

  const { createHmac } = await import("node:crypto");
  const expected = createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");

  return constantTimeEqual(expected, signature);
}

/** Length-agnostic and non-throwing, so a wrong-length value is just false. */
async function constantTimeEqual(a: string, b: string): Promise<boolean> {
  const { timingSafeEqual } = await import("node:crypto");
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
