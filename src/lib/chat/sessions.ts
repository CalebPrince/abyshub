import "server-only";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import type { Turn } from "@/lib/ai/engine";

/**
 * Lisa's memory, keyed by a token that means the same thing on every channel:
 * "whatsapp:+233…" for WhatsApp, a random browser token for the widget.
 *
 * Service role only. A transcript holds whatever a customer typed — addresses,
 * phone numbers, what they are buying and for whom — so `chat_sessions` has
 * RLS on and no policies at all, the same footing as secure_settings.
 */

/**
 * How much history travels with each turn.
 *
 * Every message costs the whole transcript again, on every provider, so this
 * is a bill as much as a memory. Twenty turns is roughly the last ten
 * exchanges, which covers "the blue one" pointing back at something said a
 * few messages ago without carrying an hour-old conversation forever.
 */
const MAX_TURNS = 20;

export type ChatSession = {
  id: string;
  token: string;
  transcript: Turn[];
  clientName: string | null;
  clientPhone: string | null;
  needsHuman: boolean;
};

export function rollingTranscript(transcript: Turn[]): Turn[] {
  return transcript.slice(-MAX_TURNS);
}

function parseTranscript(value: unknown): Turn[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry): Turn[] => {
    if (typeof entry !== "object" || entry === null) return [];
    const { role, text } = entry as Record<string, unknown>;
    if (typeof text !== "string" || !text) return [];
    return [{ role: role === "assistant" ? "assistant" : "user", text }];
  });
}

/**
 * Finds the conversation behind a token, creating it on first contact.
 *
 * Returns null when Supabase is not configured rather than throwing — Lisa
 * should still answer on a shop with no database, just without remembering.
 */
export async function findOrCreateSession(
  token: string,
  channel: "web" | "whatsapp" | "voice",
  details: { name?: string | null; phone?: string | null } = {}
): Promise<ChatSession | null> {
  if (!adminClientAvailable() || !token) return null;

  const supabase = createAdminClient();
  const { data: existing } = await supabase
    .from("chat_sessions")
    .select("id, token, transcript_json, client_name, client_phone, needs_human")
    .eq("token", token)
    .maybeSingle();

  if (existing) {
    // Fill in a name or number learned since the session started, without
    // overwriting one already known.
    const patch: Record<string, string> = {};
    if (!existing.client_name && details.name) patch.client_name = details.name;
    if (!existing.client_phone && details.phone) patch.client_phone = details.phone;
    if (Object.keys(patch).length > 0) {
      await supabase.from("chat_sessions").update(patch).eq("id", existing.id);
    }

    return {
      id: existing.id,
      token: existing.token,
      transcript: parseTranscript(existing.transcript_json),
      clientName: patch.client_name ?? existing.client_name,
      clientPhone: patch.client_phone ?? existing.client_phone,
      needsHuman: existing.needs_human,
    };
  }

  const { data: created, error } = await supabase
    .from("chat_sessions")
    .insert({
      token,
      channel,
      client_name: details.name || null,
      client_phone: details.phone || null,
    })
    .select("id, token, transcript_json, client_name, client_phone, needs_human")
    .maybeSingle();

  if (error || !created) {
    console.error("[lisa] could not open a session", token, error?.message);
    return null;
  }

  return {
    id: created.id,
    token: created.token,
    transcript: [],
    clientName: created.client_name,
    clientPhone: created.client_phone,
    needsHuman: created.needs_human,
  };
}

export async function saveTranscript(
  sessionId: string,
  transcript: Turn[],
  needsHuman = false
): Promise<void> {
  if (!adminClientAvailable()) return;

  const supabase = createAdminClient();
  const patch: Record<string, unknown> = {
    transcript_json: rollingTranscript(transcript),
    updated_at: new Date().toISOString(),
  };
  // Only ever raised here, never lowered: clearing it is a staff decision,
  // and a later turn that happens not to need help does not mean the earlier
  // request for a person was dealt with.
  if (needsHuman) patch.needs_human = true;

  const { error } = await supabase
    .from("chat_sessions")
    .update(patch)
    .eq("id", sessionId);

  if (error) console.error("[lisa] could not save transcript", sessionId, error.message);
}
