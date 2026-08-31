import "server-only";

import { getSecret, getShopSettings } from "@/lib/shop/settings";

/**
 * Reads the WhatsApp agent back from ElevenLabs, so the settings page can say
 * whether it is actually wired up.
 *
 * This is the one thing the shop asks ElevenLabs for; everything else in the
 * integration is inbound. It earns its place because the two failures that
 * matter here are both invisible from this side: an agent ID with a typo, and
 * an agent whose prompt overrides are switched off. The second is the cruel
 * one — everything looks configured, the webhooks fire, and Lisa answers every
 * question knowing nothing about the shop, because ElevenLabs quietly ignored
 * the prompt the init webhook sent and used its own empty default instead.
 *
 * Finding that out by messaging the number and reading a wrong answer is a bad
 * way to find it out.
 */

export type AgentStatus =
  | { state: "unconfigured"; detail: string }
  | { state: "error"; detail: string }
  | {
      state: "ok";
      name: string;
      /** False is the silent-failure case, and the reason this check exists. */
      overridesPrompt: boolean;
    };

/** Shape of the slice of ElevenLabs' agent payload this actually reads. */
type AgentPayload = {
  name?: unknown;
  platform_settings?: {
    overrides?: {
      conversation_config_override?: {
        agent?: { prompt?: { prompt?: unknown } };
      };
    };
  };
};

export async function readAgentStatus(): Promise<AgentStatus> {
  const [settings, apiKey] = await Promise.all([
    getShopSettings(),
    getSecret("elevenlabs_api_key", process.env.ELEVENLABS_API_KEY),
  ]);

  const agentId = settings.elevenLabsAgentId;
  if (!agentId) {
    return { state: "unconfigured", detail: "No agent ID set." };
  }
  if (!apiKey) {
    return {
      state: "unconfigured",
      detail: "No API key set — the agent cannot be read back without one.",
    };
  }

  let response: Response;
  try {
    response = await fetch(
      `https://api.elevenlabs.io/v1/convai/agents/${encodeURIComponent(agentId)}`,
      {
        headers: { "xi-api-key": apiKey },
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      }
    );
  } catch {
    return { state: "error", detail: "Could not reach ElevenLabs." };
  }

  if (response.status === 401 || response.status === 403) {
    return { state: "error", detail: "The API key was rejected." };
  }
  if (response.status === 404) {
    return { state: "error", detail: `No agent with the ID ${agentId}.` };
  }
  if (!response.ok) {
    return { state: "error", detail: `ElevenLabs returned ${response.status}.` };
  }

  let payload: AgentPayload;
  try {
    payload = (await response.json()) as AgentPayload;
  } catch {
    return { state: "error", detail: "ElevenLabs sent something unreadable." };
  }

  // Absent means not enabled. The nesting is ElevenLabs' own, and reading it
  // defensively costs nothing — a shape change should show up here as "not
  // enabled" rather than as a crashed settings page.
  const overridesPrompt = Boolean(
    payload.platform_settings?.overrides?.conversation_config_override?.agent
      ?.prompt?.prompt
  );

  return {
    state: "ok",
    name: typeof payload.name === "string" && payload.name ? payload.name : agentId,
    overridesPrompt,
  };
}
