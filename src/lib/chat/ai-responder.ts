import type { ChatReply, Responder } from "@/lib/chat/types";
import { scriptedResponder } from "@/lib/chat/scripted-responder";

/**
 * The Responder the widget actually uses: asks the server, and falls back to
 * the scripted rules whenever it cannot get an answer.
 *
 * This is the seam lib/chat/types.ts describes, filled in. The scripted
 * responder stays underneath rather than being replaced, because it is the
 * one path that physically cannot invent a price or a product — so a provider
 * outage, a network drop or a shop with no API keys degrades to something
 * narrow and true instead of an apology or, worse, a confident guess.
 */
export const aiResponder: Responder = async (input, context): Promise<ChatReply> => {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input, token: sessionToken() }),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        reply?: string | null;
        handoff?: boolean;
      };

      if (data.reply && data.reply.trim()) {
        return {
          text: data.reply.trim(),
          handoff: data.handoff === true,
          // Quick replies stay the scripted set's job. The model writes its
          // own next line; inventing chips for it would put words in the
          // customer's mouth that the answer may not have earned.
        };
      }
    }
  } catch {
    // Offline, blocked, or the route errored. Nothing to report to the
    // visitor — they get a scripted answer and never know.
  }

  return scriptedResponder(input, context);
};

const TOKEN_KEY = "abyshub.chat.token";

/**
 * A per-browser handle so Lisa remembers the last few turns.
 *
 * Not an identity and not a secret: it grants nothing but continuity of one
 * conversation, and the server reads no customer records from it. Kept in
 * localStorage so closing the tab does not lose the thread mid-question;
 * storage being unavailable simply means each turn starts fresh.
 */
function sessionToken(): string {
  try {
    const existing = window.localStorage.getItem(TOKEN_KEY);
    if (existing) return existing;

    const token = `web:${crypto.randomUUID()}`;
    window.localStorage.setItem(TOKEN_KEY, token);
    return token;
  } catch {
    return "";
  }
}
