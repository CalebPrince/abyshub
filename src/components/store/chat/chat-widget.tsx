"use client";

import * as React from "react";
import { MessageCircleIcon, SendIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatHandoff } from "@/components/store/chat/chat-handoff";
import {
  ChatMessage,
  TypingIndicator,
} from "@/components/store/chat/chat-message";
import { useCart } from "@/components/store/cart-provider";
import {
  GREETING,
  scriptedResponder,
} from "@/lib/chat/scripted-responder";
import type {
  ChatMessage as Message,
  Responder,
} from "@/lib/chat/types";
import { ASSISTANT_NAME, whatsappEnabled } from "@/lib/config";
import { cn } from "@/lib/utils";

let messageId = 0;
const nextId = () => `m${++messageId}`;

export function ChatWidget({
  responder = scriptedResponder,
}: {
  /** Swap in an AI-backed responder here — see lib/chat/types.ts. */
  responder?: Responder;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showHandoff, setShowHandoff] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>(() => [
    { id: nextId(), role: "assistant", ...GREETING },
  ]);

  const { lines } = useCart();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Keep the newest message in view as the conversation grows.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, thinking, showHandoff]);

  const send = React.useCallback(
    async (raw: string) => {
      const text = raw.trim();
      if (!text || thinking) return;

      setDraft("");
      setShowHandoff(false);
      setMessages((current) => [
        ...current,
        { id: nextId(), role: "user", text },
      ]);
      setThinking(true);

      const reply = await responder(text, {
        basket: lines.map((line) => line.product.name),
        whatsappEnabled,
      });

      // A beat of "typing" so answers don't snap in faster than they read.
      const timer = setTimeout(() => {
        setThinking(false);
        setMessages((current) => [
          ...current,
          { id: nextId(), role: "assistant", ...reply },
        ]);
        if (reply.handoff) setShowHandoff(true);
      }, 450);
      timers.current.push(timer);
    },
    [lines, responder, thinking]
  );

  function handleOpen() {
    setIsOpen(true);
    // Focus the field once the panel has painted.
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    timers.current.push(timer);
  }

  return (
    <>
      {/* Launcher — renders identically on server and client, so no basket or
          conversation state can leak into the first paint. */}
      <button
        type="button"
        onClick={isOpen ? () => setIsOpen(false) : handleOpen}
        aria-expanded={isOpen}
        aria-controls="abyshub-chat-panel"
        aria-label={isOpen ? "Close chat" : `Chat with ${ASSISTANT_NAME}`}
        className={cn(
          "bg-primary text-primary-foreground bg-linear-to-b from-white/20 to-black/15 shadow-primary/40 hover:bg-brand-pink-deep focus-visible:ring-ring/60 focus-visible:ring-offset-background fixed right-4 bottom-4 z-50 flex size-14 cursor-pointer items-center justify-center rounded-full shadow-lg transition-all hover:shadow-xl active:translate-y-px focus-visible:ring-[3px] focus-visible:ring-offset-2 focus-visible:outline-none sm:right-6 sm:bottom-6",
          isOpen && "bg-primary text-primary-foreground hover:bg-primary/90"
        )}
      >
        {isOpen ? (
          <XIcon className="size-6" />
        ) : (
          <MessageCircleIcon className="size-6" />
        )}
      </button>

      {isOpen && (
        <div
          id="abyshub-chat-panel"
          role="dialog"
          aria-label={`Chat with ${ASSISTANT_NAME}`}
          className="bg-background border-foreground/15 fixed inset-x-4 bottom-22 z-50 flex max-h-[min(34rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-2xl border shadow-2xl sm:inset-x-auto sm:right-6 sm:bottom-24 sm:w-96"
        >
          <header className="bg-primary text-primary-foreground flex items-center gap-3 px-4 py-3">
            <span
              aria-hidden
              className="bg-primary font-display bg-linear-to-b from-white/20 to-black/15 grid size-9 shrink-0 place-items-center rounded-full text-sm font-extrabold shadow-sm"
            >
              {ASSISTANT_NAME.charAt(0)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-display leading-tight font-extrabold tracking-tight uppercase">
                {ASSISTANT_NAME}
              </p>
              <p className="text-background/60 flex items-center gap-1.5 text-[11px]">
                <span className="size-1.5 rounded-full bg-emerald-400" />
                Abys Hub assistant
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Close chat"
              className="text-background/70 hover:text-background cursor-pointer"
            >
              <XIcon className="size-5" />
            </button>
          </header>

          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto p-4"
            role="log"
          >
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onQuickReply={send}
              />
            ))}

            {thinking && <TypingIndicator />}

            {showHandoff && (
              <ChatHandoff
                transcript={messages}
                onClose={() => setShowHandoff(false)}
              />
            )}
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              void send(draft);
            }}
            className="border-foreground/12 flex gap-2 border-t p-3"
          >
            <Input
              ref={inputRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={`Ask ${ASSISTANT_NAME} something…`}
              aria-label="Your message"
              className="h-10"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0"
              disabled={!draft.trim() || thinking}
              aria-label="Send message"
            >
              <SendIcon className="size-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
