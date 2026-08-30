import { NextResponse } from "next/server";

import { createToolExecutor } from "@/lib/chat/lisa";
import { findOrCreateSession, saveTranscript } from "@/lib/chat/sessions";
import { verifyElevenLabsSecret } from "@/lib/chat/elevenlabs";

/**
 * One dispatcher for every tool the WhatsApp agent calls.
 *
 * Generic on purpose: each tool is configured in the ElevenLabs dashboard to
 * post here with its own name, so adding a tool to lib/chat/lisa.ts makes it
 * available on WhatsApp without another route. The alternative — an endpoint
 * per tool — is how the two channels start answering differently.
 *
 * Tools run against the public catalogue only. Nothing here reads a customer
 * record, so a caller who spoofed a session token would gain nothing they
 * could not read on the website.
 */
export async function POST(request: Request) {
  if (!(await verifyElevenLabsSecret(request))) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 403 });
  }

  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const name = String(payload.tool ?? payload.name ?? payload.tool_name ?? "");
  if (!name) {
    return NextResponse.json({ error: "No tool named." }, { status: 422 });
  }

  const rawArgs = payload.args ?? payload.parameters ?? payload.input ?? {};
  const args =
    typeof rawArgs === "object" && rawArgs !== null
      ? (rawArgs as Record<string, unknown>)
      : {};

  const token = String(payload.session_token ?? "");

  let handoff: string | null = null;
  const executor = createToolExecutor({
    onHandoff: (reason) => {
      handoff = reason;
    },
  });

  const result = await executor(name, args);

  // A request for a person has to outlive the call, or it is only ever heard
  // by the agent that raised it.
  if (handoff !== null && token) {
    const session = await findOrCreateSession(token, "whatsapp");
    if (session) {
      await saveTranscript(
        session.id,
        [...session.transcript, { role: "user", text: `[asked for a person: ${handoff}]` }],
        true
      );
    }
  }

  return NextResponse.json({ result });
}
