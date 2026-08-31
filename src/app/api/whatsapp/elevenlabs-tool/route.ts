import { NextResponse } from "next/server";

import { createToolExecutor } from "@/lib/chat/lisa";
import { findOrCreateSession, saveTranscript } from "@/lib/chat/sessions";
import { verifyElevenLabsSecret } from "@/lib/chat/elevenlabs";

/**
 * GET, for the tools that take no arguments.
 *
 * `get_delivery_terms` and `recommend_products` have nothing to send, and a
 * POST with no body is the kind of thing tooling refuses on both sides — the
 * dashboard for defining it, the odd proxy for forwarding it. As a read with
 * no arguments, GET is also just the honest verb.
 *
 * Everything a GET can carry is in the URL, so it cannot reach the one tool
 * that needs a session token; `request_human` stays a POST.
 */
export async function GET(request: Request) {
  return dispatch(request, {});
}

export async function POST(request: Request) {
  let payload: Record<string, unknown> = {};
  try {
    payload = await request.json();
  } catch {
    // A tool that takes no arguments has nothing to send, and ElevenLabs may
    // post nothing at all rather than an empty object. That is not an error
    // when the tool is named in the URL.
    payload = {};
  }
  return dispatch(request, payload);
}

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
async function dispatch(request: Request, payload: Record<string, unknown>) {
  if (!(await verifyElevenLabsSecret(request))) {
    return NextResponse.json({ error: "Invalid webhook secret." }, { status: 403 });
  }

  const query = new URL(request.url).searchParams;

  // The query string is checked last but matters most in practice: naming the
  // tool there makes each dashboard entry a plain URL with no body schema to
  // configure, which is the difference between three of these tools needing
  // no request-body setup and all four needing it exactly right.
  const name = String(
    payload.tool ?? payload.name ?? payload.tool_name ?? query.get("tool") ?? ""
  );
  if (!name) {
    return NextResponse.json({ error: "No tool named." }, { status: 422 });
  }

  // ElevenLabs sends the model's arguments at the top level of the body. The
  // nested forms come first for callers that wrap them, and the body itself is
  // the fallback — minus the fields that are ours rather than the tool's.
  const nested = payload.args ?? payload.parameters ?? payload.input;
  const args =
    typeof nested === "object" && nested !== null
      ? (nested as Record<string, unknown>)
      : { ...queryArgs(query), ...withoutEnvelope(payload) };

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

/**
 * The body minus the envelope fields, for the common case where ElevenLabs
 * puts the model's arguments straight at the top level.
 *
 * Passing `session_token` through as though it were a tool argument would be
 * harmless today — the executor ignores what it does not know — but it is the
 * shop's plumbing, not something the model chose, and a tool that starts
 * validating its arguments strictly should not trip over it.
 */
function withoutEnvelope(payload: Record<string, unknown>): Record<string, unknown> {
  const { tool, name, tool_name, session_token, ...rest } = payload;
  void tool;
  void name;
  void tool_name;
  void session_token;
  return rest;
}

/**
 * Query parameters that are tool arguments rather than routing.
 *
 * A GET has nowhere else to put them. `secret` and `tool` are addressed to
 * this route, not to the tool, and `session_token` is deliberately not read
 * here — it holds a customer's phone number, and a URL is the one place a
 * value like that should never travel, since it survives in access logs on
 * every hop that handled the request.
 */
function queryArgs(query: URLSearchParams): Record<string, unknown> {
  const args: Record<string, unknown> = {};
  for (const [key, value] of query) {
    if (key === "secret" || key === "tool" || key === "session_token") continue;
    args[key] = value === "true" ? true : value === "false" ? false : value;
  }
  return args;
}
