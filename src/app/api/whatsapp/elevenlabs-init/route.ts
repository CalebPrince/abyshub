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
  const systemPrompt = await buildSystemPrompt();

  if (!digits) {
    // No number means no session and no history, but the conversation can
    // still happen. Logged because a payload whose shape we misread would
    // show up here first.
    console.error("[lisa] elevenlabs init without a caller id");
    return NextResponse.json(initResponse(systemPrompt, null));
  }

  const token = whatsappToken(digits);
  const session = await findOrCreateSession(token, "whatsapp", {
    phone: `+${digits}`,
    name: typeof payload.caller_name === "string" ? payload.caller_name : null,
  });

  const history = rollingTranscript(session?.transcript ?? []);
  const prompt = history.length
    ? `${systemPrompt}\n\nEARLIER IN THIS CONVERSATION (already said — do not greet them again, and do not re-ask anything answered here):\n${history
        .map((turn) => `${turn.role === "user" ? "Customer" : "Lisa"}: ${turn.text}`)
        .join("\n")}`
    : systemPrompt;

  return NextResponse.json(initResponse(prompt, token, `+${digits}`));
}

function initResponse(prompt: string, token: string | null, phone?: string) {
  return {
    type: "conversation_initiation_client_data",
    // The tool webhook has no other way to know which conversation it is
    // serving, so the token rides along as a dynamic variable and comes back
    // on every tool call.
    dynamic_variables: {
      session_token: token ?? "",
      caller_phone: phone ?? "",
    },
    conversation_config_override: {
      agent: { prompt: { prompt } },
    },
  };
}
