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
  const handoff = readHandoff(payload);
  if (turns.length === 0 && !handoff) {
    return NextResponse.json({ ok: true, stored: false });
  }

  const session = await findOrCreateSession(token, "whatsapp");
  if (!session) return NextResponse.json({ ok: true, stored: false });

  // A request for a person is recorded here rather than by the tool that
  // raised it. ElevenLabs refuses to create a tool carrying a dynamic
  // variable, so the tool webhook has no way of knowing which conversation
  // called it — whereas this payload names the caller. The cost is that a
  // handoff surfaces when the conversation ends rather than the moment it is
  // asked for; the alternative was a tool that tells the customer someone will
  // follow up and quietly tells nobody.
  const marked = handoff
    ? [...turns, { role: "user" as const, text: `[asked for a person: ${handoff}]` }]
    : turns;

  await saveTranscript(
    session.id,
    [...session.transcript, ...marked],
    session.needsHuman || handoff !== null
  );

  return NextResponse.json({
    ok: true,
    stored: true,
    turns: marked.length,
    handoff: handoff !== null,
  });
}

/**
 * Whether the agent called `request_human` during the conversation, and why.
 *
 * ElevenLabs reports tool calls in more than one shape and has moved them
 * about, so the plausible spots are swept rather than one being assumed. A
 * missed handoff is a customer who asked for a person and was never passed to
 * one, which is worse than a false positive: the cost of reading this too
 * eagerly is a staff member glancing at a conversation that did not need them.
 */
function readHandoff(payload: Record<string, unknown>): string | null {
  const seen: unknown[] = [
    payload.tool_calls,
    asRecord(payload.data).tool_calls,
    asRecord(payload.analysis).tool_calls,
    payload.transcript,
    asRecord(payload.data).transcript,
    payload.messages,
  ];

  for (const candidate of seen) {
    if (!Array.isArray(candidate)) continue;

    for (const entry of candidate) {
      const item = asRecord(entry);
      const name = String(item.tool_name ?? item.name ?? item.tool ?? "");
      if (name === "request_human") return reasonFrom(item);

      // Transcript turns carry their tool calls nested inside them.
      const nested = item.tool_calls;
      if (Array.isArray(nested)) {
        for (const call of nested) {
          const record = asRecord(call);
          const nestedName = String(record.tool_name ?? record.name ?? record.tool ?? "");
          if (nestedName === "request_human") return reasonFrom(record);
        }
      }
    }
  }

  return null;
}

/** The reason the agent gave, or a stand-in so the flag is never empty. */
function reasonFrom(call: Record<string, unknown>): string {
  const raw = call.params_as_json ?? call.arguments ?? call.args ?? call.parameters;

  // ElevenLabs sends these as a JSON string in some shapes and an object in
  // others. Parsing a string that is not JSON must not take the handoff down
  // with it — the flag matters far more than the sentence explaining it.
  let args: Record<string, unknown> = {};
  if (typeof raw === "string") {
    try {
      args = asRecord(JSON.parse(raw));
    } catch {
      args = {};
    }
  } else {
    args = asRecord(raw);
  }

  const reason = String(args.reason ?? "").trim();
  return reason || "no reason given";
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
