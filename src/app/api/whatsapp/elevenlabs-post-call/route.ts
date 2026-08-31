import { NextResponse } from "next/server";

import { findOrCreateSession, saveTranscript } from "@/lib/chat/sessions";
import {
  normalisePhone,
  verifyElevenLabsSecret,
  verifyElevenLabsSignature,
  whatsappToken,
} from "@/lib/chat/elevenlabs";
import type { Turn } from "@/lib/ai/engine";

/**
 * The finished conversation, posted back when a WhatsApp chat or call ends.
 *
 * This is the only way anything said on WhatsApp reaches our side: the
 * conversation itself happened entirely on ElevenLabs' servers. Storing it is
 * what lets the init webhook hand the *next* conversation its history, and
 * what puts WhatsApp exchanges in front of staff at all.
 */
export async function POST(request: Request) {
  // Read the body as text first: the signature is over the exact bytes sent,
  // and `request.json()` consumes the stream, leaving nothing to verify.
  const rawBody = await request.text();

  // ElevenLabs signs this webhook with a secret it generates, and does not
  // send the shared header the other two use. The header check stays as a
  // fallback for a workspace configured the older way, so an installation that
  // already worked keeps working.
  const verified =
    (await verifyElevenLabsSignature(request, rawBody)) ||
    (await verifyElevenLabsSecret(request));
  if (!verified) {
    return NextResponse.json({ error: "Invalid webhook signature." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  // The token is preferred — it is what we handed out at init. The caller id
  // is the fallback for a payload that does not echo dynamic variables back.
  const variables = asRecord(payload.dynamic_variables ?? payload.conversation_initiation_client_data);
  const token =
    String(variables.session_token ?? payload.session_token ?? "") ||
    tokenFromCaller(payload);

  if (!token) {
    console.error("[lisa] post-call webhook with no session token or caller id");
    return NextResponse.json({ ok: true, stored: false });
  }

  const turns = readTranscript(payload);
  if (turns.length === 0) return NextResponse.json({ ok: true, stored: false });

  const session = await findOrCreateSession(token, "whatsapp");
  if (!session) return NextResponse.json({ ok: true, stored: false });

  // Appended rather than replacing: a call that ends mid-thread should not
  // erase what was typed before it.
  await saveTranscript(session.id, [...session.transcript, ...turns], session.needsHuman);

  return NextResponse.json({ ok: true, stored: true, turns: turns.length });
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function tokenFromCaller(payload: Record<string, unknown>): string {
  const metadata = asRecord(payload.metadata);
  const caller = String(
    payload.caller_id ?? payload.from ?? metadata.caller_id ?? metadata.phone_number ?? ""
  );
  const digits = normalisePhone(caller);
  return digits ? whatsappToken(digits) : "";
}

/**
 * ElevenLabs has moved this field around between shapes, so the likely spots
 * are tried in turn rather than assuming one. An unrecognised shape stores
 * nothing and says so, instead of writing a transcript of empty turns.
 */
function readTranscript(payload: Record<string, unknown>): Turn[] {
  const candidates = [
    payload.transcript,
    asRecord(payload.data).transcript,
    payload.messages,
    asRecord(payload.analysis).transcript,
  ];

  const raw = candidates.find(Array.isArray) as unknown[] | undefined;
  if (!raw) return [];

  return raw.flatMap((entry): Turn[] => {
    const item = asRecord(entry);
    const text = String(item.message ?? item.text ?? item.content ?? "").trim();
    if (!text) return [];

    // Their role names differ by product surface — "agent" on voice, sometimes
    // "assistant" on chat — and anything that is not the customer is Lisa.
    const role = String(item.role ?? item.speaker ?? "user").toLowerCase();
    return [{ role: role === "user" || role === "customer" ? "user" : "assistant", text }];
  });
}
