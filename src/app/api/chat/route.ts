import { NextResponse, type NextRequest } from "next/server";

import { runAgent, agentAvailable } from "@/lib/ai/engine";
import { buildSystemPrompt, toolDeclarations, createToolExecutor } from "@/lib/chat/lisa";
import { findOrCreateSession, rollingTranscript, saveTranscript } from "@/lib/chat/sessions";

/**
 * The storefront widget's turn.
 *
 * Answers null when no provider is configured or every one of them fails, and
 * the widget then falls back to its scripted replies. That fallback is the
 * point rather than an afterthought: the scripted responder cannot invent a
 * price or a product, so an unanswerable moment degrades to something narrow
 * and true instead of nothing at all.
 *
 * The token is the browser's, not a signed identity — it buys continuity
 * within a conversation and nothing else. Nothing here reads customer
 * records, and the tools only ever see the public catalogue.
 */
export async function POST(request: NextRequest) {
  let payload: { message?: unknown; token?: unknown };
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Malformed request." }, { status: 400 });
  }

  const message = typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Say something first." }, { status: 400 });
  }

  // Long enough to hold a real question, short enough that nobody is pasting
  // a document in to burn tokens.
  if (message.length > 1000) {
    return NextResponse.json({ error: "That message is too long." }, { status: 413 });
  }

  if (!(await agentAvailable())) {
    return NextResponse.json({ reply: null, provider: null });
  }

  const token = typeof payload.token === "string" ? payload.token.slice(0, 100) : "";
  const session = token ? await findOrCreateSession(token, "web") : null;

  const transcript = rollingTranscript([
    ...(session?.transcript ?? []),
    { role: "user" as const, text: message },
  ]);

  let handoff: string | null = null;
  const executor = createToolExecutor({
    onHandoff: (reason) => {
      handoff = reason;
    },
  });

  const { reply, provider } = await runAgent({
    systemPrompt: await buildSystemPrompt(),
    tools: toolDeclarations,
    executor,
    transcript,
  });

  if (session && reply) {
    await saveTranscript(
      session.id,
      [...transcript, { role: "assistant", text: reply }],
      handoff !== null
    );
  }

  return NextResponse.json({
    reply,
    provider,
    // The widget opens its handoff form on this, exactly as the scripted
    // responder's own `handoff` flag does.
    handoff: handoff !== null,
  });
}
