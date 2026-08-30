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
  const expected = await getSecret(
    "elevenlabs_webhook_secret",
    process.env.ELEVENLABS_WEBHOOK_SECRET
  );
  if (!expected) return false;

  const received =
    request.headers.get("x-elevenlabs-secret") ??
    request.headers.get("x-webhook-secret") ??
    "";
  if (!received) return false;

  const { timingSafeEqual } = await import("node:crypto");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(received, "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
