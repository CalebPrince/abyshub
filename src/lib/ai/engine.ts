import "server-only";

import { getSecret } from "@/lib/shop/settings";

/**
 * One tool-calling engine, three providers, tried in the order below and each
 * skipped when its key is blank.
 *
 * A provider that fails does not hand the conversation over mid-turn — the
 * whole turn is retried against the next one from the same transcript. Their
 * tool-calling shapes differ enough (Gemini's functionCall/functionResponse,
 * Anthropic's tool_use/tool_result, Groq's OpenAI-style tool_calls) that each
 * gets its own loop rather than a lowest-common-denominator abstraction that
 * would be wrong for all three.
 *
 * Three keys because they bill separately. Any one is enough to run, and all
 * three being out of credit at once is the only thing that silences Lisa.
 */

export type ToolDeclaration = {
  name: string;
  description: string;
  /** JSON Schema object. Every provider accepts this shape for parameters. */
  parameters: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
};

export type ToolExecutor = (
  name: string,
  args: Record<string, unknown>
) => Promise<unknown>;

export type Turn = { role: "user" | "assistant"; text: string };

export type Provider = "gemini" | "anthropic" | "groq";

export type AgentResult = {
  reply: string | null;
  provider: Provider | null;
};

export type AgentRequest = {
  systemPrompt: string;
  tools: ToolDeclaration[];
  executor: ToolExecutor;
  transcript: Turn[];
  /** Rounds of tool calls allowed before the turn gives up. */
  maxToolRounds?: number;
  /**
   * Voice cannot sit through a chain of timeouts, so it reorders the
   * providers to put the fastest first and keeps every budget short.
   */
  lowLatency?: boolean;
};

const MODELS = {
  gemini: "gemini-2.5-flash",
  anthropic: "claude-sonnet-5",
  groq: "llama-3.3-70b-versatile",
} as const;

/**
 * Generous on the standard path — a slow answer beats a scripted one — and
 * tight for voice, where silence past a couple of seconds reads as a dropped
 * call. These are whole-request budgets, tool rounds included.
 */
const TIMEOUTS = {
  standard: { gemini: 12_000, anthropic: 20_000, groq: 20_000 },
  fast: { gemini: 6_000, anthropic: 7_000, groq: 6_000 },
} as const;

const KEY_SETTING: Record<Provider, string> = {
  gemini: "gemini_api_key",
  anthropic: "anthropic_api_key",
  groq: "groq_api_key",
};

const ENV_FALLBACK: Record<Provider, string | undefined> = {
  gemini: process.env.GEMINI_API_KEY,
  anthropic: process.env.ANTHROPIC_API_KEY,
  groq: process.env.GROQ_API_KEY,
};

/** True when at least one provider is configured, so callers can skip ahead. */
export async function agentAvailable(): Promise<boolean> {
  const keys = await Promise.all(
    (Object.keys(KEY_SETTING) as Provider[]).map((p) =>
      getSecret(KEY_SETTING[p], ENV_FALLBACK[p])
    )
  );
  return keys.some(Boolean);
}

export async function runAgent(request: AgentRequest): Promise<AgentResult> {
  const order: Provider[] = request.lowLatency
    ? ["groq", "gemini", "anthropic"]
    : ["gemini", "anthropic", "groq"];

  const budgets = request.lowLatency ? TIMEOUTS.fast : TIMEOUTS.standard;

  for (const provider of order) {
    const key = await getSecret(KEY_SETTING[provider], ENV_FALLBACK[provider]);
    if (!key) continue;

    try {
      const reply = await callProvider(provider, key, request, budgets[provider]);
      if (reply && reply.trim()) return { reply: reply.trim(), provider };
    } catch (error) {
      // Logged rather than thrown: the next provider is the recovery, and a
      // caller that gets null falls back to the scripted replies.
      console.error(`[lisa] ${provider} failed`, error);
    }
  }

  return { reply: null, provider: null };
}

function callProvider(
  provider: Provider,
  key: string,
  request: AgentRequest,
  timeout: number
): Promise<string | null> {
  if (provider === "gemini") return runGemini(key, request, timeout);
  if (provider === "anthropic") return runAnthropic(key, request, timeout);
  return runGroq(key, request, timeout);
}

async function postJson<T>(url: string, init: RequestInit, timeout: number): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`${response.status} ${body.slice(0, 300)}`);
  }

  return response.json() as Promise<T>;
}

/** Tool results go back as JSON whatever the provider, so this is shared. */
async function callTool(
  executor: ToolExecutor,
  name: string,
  args: Record<string, unknown>
) {
  try {
    return await executor(name, args);
  } catch (error) {
    // A thrown tool is a bug in the tool, not a reason to lose the turn. The
    // model is told it failed and can say so, or try something else.
    console.error(`[lisa] tool ${name} threw`, error);
    return { error: "That lookup failed." };
  }
}

// --- Gemini -----------------------------------------------------------------

type GeminiPart = {
  text?: string;
  functionCall?: { name: string; args?: Record<string, unknown> };
  functionResponse?: { name: string; response: Record<string, unknown> };
};

type GeminiResponse = {
  candidates?: { content?: { parts?: GeminiPart[] } }[];
};

async function runGemini(
  key: string,
  { systemPrompt, tools, executor, transcript, maxToolRounds = 2 }: AgentRequest,
  timeout: number
): Promise<string | null> {
  const contents: { role: string; parts: GeminiPart[] }[] = transcript.map(
    (turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [{ text: turn.text }],
    })
  );

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    ...(tools.length
      ? {
          tools: [
            {
              functionDeclarations: tools.map((tool) => ({
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              })),
            },
          ],
        }
      : {}),
  };

  for (let round = 0; round <= maxToolRounds; round++) {
    const payload = await postJson<GeminiResponse>(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODELS.gemini}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, contents }),
      },
      timeout
    );

    const candidate = payload.candidates?.[0];
    const parts: GeminiPart[] = candidate?.content?.parts ?? [];
    const calls = parts.filter((part) => part.functionCall);

    if (calls.length === 0) {
      const text = parts
        .map((part) => (typeof part.text === "string" ? part.text : ""))
        .join("")
        .trim();
      return text || null;
    }

    // The model's own turn has to be echoed back before its results, or the
    // next request has answers to questions it never sees asked.
    contents.push({ role: "model", parts });

    const responses: GeminiPart[] = [];
    for (const part of calls) {
      const call = part.functionCall!;
      const result = await callTool(executor, call.name, call.args ?? {});
      responses.push({
        functionResponse: { name: call.name, response: { result } },
      });
    }
    contents.push({ role: "user", parts: responses });
  }

  return null;
}

// --- Anthropic --------------------------------------------------------------

type AnthropicBlock = {
  type: string;
  text?: string;
  id?: string;
  name?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: string;
};

type AnthropicResponse = { content?: AnthropicBlock[] };

async function runAnthropic(
  key: string,
  { systemPrompt, tools, executor, transcript, maxToolRounds = 2 }: AgentRequest,
  timeout: number
): Promise<string | null> {
  const messages: { role: string; content: unknown }[] = transcript.map((turn) => ({
    role: turn.role === "assistant" ? "assistant" : "user",
    content: turn.text,
  }));

  for (let round = 0; round <= maxToolRounds; round++) {
    const payload = await postJson<AnthropicResponse>(
      "https://api.anthropic.com/v1/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: MODELS.anthropic,
          max_tokens: 1024,
          system: systemPrompt,
          messages,
          ...(tools.length
            ? {
                tools: tools.map((tool) => ({
                  name: tool.name,
                  description: tool.description,
                  input_schema: tool.parameters,
                })),
              }
            : {}),
        }),
      },
      timeout
    );

    const content: AnthropicBlock[] = payload.content ?? [];
    const toolUses = content.filter((block) => block.type === "tool_use");

    if (toolUses.length === 0) {
      const text = content
        .filter((block) => block.type === "text")
        .map((block) => String(block.text ?? ""))
        .join("")
        .trim();
      return text || null;
    }

    messages.push({ role: "assistant", content });

    const results: AnthropicBlock[] = [];
    for (const block of toolUses) {
      const result = await callTool(executor, block.name ?? "", block.input ?? {});
      results.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: JSON.stringify(result),
      });
    }
    messages.push({ role: "user", content: results });
  }

  return null;
}

// --- Groq (OpenAI-shaped) ---------------------------------------------------

type GroqToolCall = { id: string; function: { name: string; arguments?: string } };
type GroqMessage = { content?: string | null; tool_calls?: GroqToolCall[] };
type GroqResponse = { choices?: { message?: GroqMessage }[] };

async function runGroq(
  key: string,
  { systemPrompt, tools, executor, transcript, maxToolRounds = 2 }: AgentRequest,
  timeout: number
): Promise<string | null> {
  const messages: Record<string, unknown>[] = [
    { role: "system", content: systemPrompt },
    ...transcript.map((turn) => ({ role: turn.role, content: turn.text })),
  ];

  for (let round = 0; round <= maxToolRounds; round++) {
    const payload = await postJson<GroqResponse>(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: MODELS.groq,
          messages,
          ...(tools.length
            ? {
                tool_choice: "auto",
                tools: tools.map((tool) => ({
                  type: "function",
                  function: {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters,
                  },
                })),
              }
            : {}),
        }),
      },
      timeout
    );

    const message = payload.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const text = typeof message?.content === "string" ? message.content.trim() : "";
      return text || null;
    }

    messages.push(message as Record<string, unknown>);

    for (const call of toolCalls) {
      const fn = call.function;
      let args: Record<string, unknown> = {};
      try {
        // Arguments arrive as a JSON *string* here, unlike the other two, and
        // a model occasionally emits one that does not parse.
        args = fn.arguments ? JSON.parse(fn.arguments) : {};
      } catch {
        args = {};
      }
      const result = await callTool(executor, fn.name, args);
      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return null;
}
