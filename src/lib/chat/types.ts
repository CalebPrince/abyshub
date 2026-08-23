import type { Product } from "@/lib/types";

export type ChatRole = "assistant" | "user";

export type ChatMessage = {
  id: string;
  role: ChatRole;
  text: string;
  /** Products to show as compact cards under the message. */
  products?: Product[];
  /** Suggested follow-ups, rendered as tappable chips. */
  quickReplies?: string[];
  /**
   * Opens the handoff form under the message. Elsewhere a "Talk to a person"
   * quick reply does the job, which routes back through the responder.
   */
  handoff?: boolean;
};

export type ChatReply = Omit<ChatMessage, "id" | "role">;

export type ChatContext = {
  /** Names of items currently in the basket, so answers can refer to them. */
  basket: string[];
  /** Whether a WhatsApp number is configured. */
  whatsappEnabled: boolean;
};

/**
 * The seam for swapping in an AI-backed assistant.
 *
 * `scriptedResponder` answers from a fixed rule set with no network calls. To
 * go AI-powered, write another Responder that posts to a route handler wrapping
 * your model of choice, ground it in `src/lib/products.ts` so it cannot invent
 * stock, and pass it to <ChatWidget responder={...} />. Nothing else changes.
 */
export type Responder = (
  input: string,
  context: ChatContext
) => ChatReply | Promise<ChatReply>;
