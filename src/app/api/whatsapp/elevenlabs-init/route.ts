import { NextResponse } from "next/server";

import { buildSystemPrompt } from "@/lib/chat/lisa";
import { findOrCreateSession, rollingTranscript } from "@/lib/chat/sessions";
import {
  normalisePhone,
  verifyElevenLabsSecret,
  whatsappToken,
} from "@/lib/chat/elevenlabs";

/**
 * ElevenLabs' "conversation initiation" webhook, called once as a WhatsApp
 * chat or call begins on the shop's number.
 *
 * This is the hinge of the whole arrangement. ElevenLabs runs the turn-by-turn
 * conversation itself, so the only way its Lisa stays the same Lisa as the
 * storefront's is to hand it the live prompt here, every time — built from the
 * current catalogue and the current delivery rules. A prompt pasted into their
 * dashboard would be a second brain that quietly goes stale.
 *
 * The prior transcript goes with it because each WhatsApp message tends to
 * open a fresh conversation on their side; without this the agent would be
 * amnesiac between one message and the next.
 */
export async function POST(request: Request) {
  if (!(await verifyElevenLabsSecret(request))) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    // An empty body still gets a usable prompt below — better a generic Lisa
    // than a failed call the customer experiences as silence.
  }

  const callerId = String(payload.caller_id ?? payload.from ?? "");
  const digits = normalisePhone(callerId);

  if (!digits) {
    // No number means no session and no history, but the conversation can
    // still happen. Logged because a payload whose shape we misread would
    // show up here first.
    console.error("[lisa] elevenlabs init without a caller id");
    return NextResponse.json(
      // The caller ID is the only thing distinguishing the owner from a
      // customer, and it arrives here and nowhere else — the storefront widget
      // has no idea who is typing.
      initResponse(await buildSystemPrompt())
    );
  }

  const token = whatsappToken(digits);

  // Together rather than in turn. ElevenLabs holds the conversation open while
  // this answers and gives up before long, so the two round trips this route
  // cannot avoid should at least overlap — nothing in the prompt depends on
  // the session, or the session on the prompt.
  const [systemPrompt, session] = await Promise.all([
    buildSystemPrompt({ callerPhone: digits }),
    findOrCreateSession(token, "whatsapp", {
      phone: `+${digits}`,
      name: typeof payload.caller_name === "string" ? payload.caller_name : null,
    }),
  ]);

  const history = rollingTranscript(session?.transcript ?? []);
  const prompt = history.length
    ? `${systemPrompt}\n\nEARLIER IN THIS CONVERSATION (already said — do not greet them again, and do not re-ask anything answered here):\n${history
        .map((turn) => `${turn.role === "user" ? "Customer" : "Lisa"}: ${turn.text}`)
        .join("\n")}`
    : systemPrompt;

  return NextResponse.json(initResponse(prompt));
}

/**
 * The prompt, and deliberately nothing else.
 *
 * This used to hand back `session_token` and `caller_phone` as dynamic
 * variables, so the tool webhook could tell which conversation was calling.
 * Nothing consumes them any more — ElevenLabs refuses to create a tool that
 * carries a dynamic variable, so `request_human` stopped taking one and the
 * handoff moved to the post-call webhook, which names the caller itself.
 *
 * They are removed rather than left as harmless residue because ElevenLabs is
 * strict about dynamic variables it was never told to expect: an undeclared
 * one is what refused those tools, with no field named and no explanation. A
 * response returning two variables the agent never declared is the same
 * mistake in the other direction, and the symptom — every conversation
 * failing outright at the moment it starts — matches.
 */
function initResponse(prompt: string) {
  return {
    type: "conversation_initiation_client_data",
    conversation_config_override: {
      agent: { prompt: { prompt } },
    },
  };
}
