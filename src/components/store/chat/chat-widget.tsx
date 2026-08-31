"use client";

import * as React from "react";
import {
  MessageCircleIcon,
  SendIcon,
  Volume2Icon,
  VolumeXIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChatHandoff } from "@/components/store/chat/chat-handoff";
import {
  ChatMessage,
  TypingIndicator,
} from "@/components/store/chat/chat-message";
import { useCart } from "@/components/store/cart-provider";
import { GREETING } from "@/lib/chat/scripted-responder";
import { aiResponder } from "@/lib/chat/ai-responder";
import type {
  ChatMessage as Message,
  Responder,
} from "@/lib/chat/types";
import {
  playTts,
  speakWithBrowser,
  stopBrowserSpeech,
  stopTts,
  unlockTts,
} from "@/lib/chat/tts";
import { forSpeech } from "@/lib/chat/speech-text";
import { ASSISTANT_NAME, whatsappEnabled } from "@/lib/config";
import { cn } from "@/lib/utils";

let messageId = 0;
const nextId = () => `m${++messageId}`;

export function ChatWidget({
  responder = aiResponder,
}: {
  /**
   * Defaults to the AI responder, which falls back to the scripted rules on
   * its own whenever the server cannot answer. Pass `scriptedResponder` here
   * to pin the widget to the rules alone.
   */
  responder?: Responder;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [showHandoff, setShowHandoff] = React.useState(false);
  const [thinking, setThinking] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<Message[]>(() => [
    { id: nextId(), role: "assistant", ...GREETING },
  ]);

  // Off until proven otherwise: speech starts silent so nobody's laptop
  // announces a shopping assistant in an open-plan office. The choice is kept
  // for the tab, not forever — a new visit starts quiet again.
  const [speechOn, setSpeechOn] = React.useState(false);
  const [speakingId, setSpeakingId] = React.useState<string | null>(null);
  const [canSpeak, setCanSpeak] = React.useState(false);

  // The same value twice: state to render from, a ref to decide from. Speech
  // callbacks fire outside React's render cycle, and a decision made against a
  // captured render is a decision made against the past.
  const speakingIdRef = React.useRef<string | null>(null);
  const setSpeaking = React.useCallback((id: string | null) => {
    speakingIdRef.current = id;
    setSpeakingId(id);
  }, []);

  const { lines, rates } = useCart();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);

  React.useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  // Browsers hand the right to play audio to a gesture, and it expires while
  // a reply is still being synthesised. One silent frame on the first touch
  // keeps a element permanently allowed.
  React.useEffect(() => {
    document.addEventListener("pointerdown", unlockTts, { capture: true, once: true });
    document.addEventListener("keydown", unlockTts, { capture: true, once: true });
    return () => {
      document.removeEventListener("pointerdown", unlockTts, { capture: true });
      document.removeEventListener("keydown", unlockTts, { capture: true });
    };
  }, []);

  React.useEffect(
    () => () => {
      stopTts();
      stopBrowserSpeech();
    },
    []
  );

  /**
   * Speak one reply, or stop if it is the one already speaking.
   *
   * The natural voice is tried first and the browser's own is the fallback —
   * `playTts` latches itself off after the first failure, so a shop with no
   * voice configured makes exactly one wasted request per page load and then
   * goes straight to the local voice.
   */
  const speak = React.useCallback(async (message: Message) => {
    const spoken = forSpeech(message.text);
    if (!spoken) return;

    // Read through the ref, not the state. The click that stops playback has
    // to compare against what is playing *now*, and a value captured when this
    // callback was built is a render behind — which shows up as a Stop button
    // that needs pressing twice.
    const wasSpeaking = speakingIdRef.current === message.id;

    stopTts();
    stopBrowserSpeech();
    setSpeaking(null);

    if (wasSpeaking) return;

    const handlers = {
      onstart: () => setSpeaking(message.id),
      // Guarded so a late `onend` from the utterance we just cancelled cannot
      // clear the state belonging to the reply that replaced it.
      onend: () => {
        if (speakingIdRef.current === message.id) setSpeaking(null);
      },
      onerror: () => {
        if (speakingIdRef.current === message.id) setSpeaking(null);
      },
    };

    try {
      await playTts(spoken, handlers);
    } catch {
      void speakWithBrowser(spoken, handlers);
    }
  }, [setSpeaking]);

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
        rates,
      });

      const answer: Message = { id: nextId(), role: "assistant", ...reply };

      // A beat of "typing" so answers don't snap in faster than they read.
      const timer = setTimeout(() => {
        setThinking(false);
        setMessages((current) => [...current, answer]);
        if (reply.handoff) setShowHandoff(true);
        if (speechOn) void speak(answer);
      }, 450);
      timers.current.push(timer);
    },
    [lines, rates, responder, speak, speechOn, thinking]
  );

  function handleOpen() {
    setIsOpen(true);

    // Read on open rather than on mount. Both values come from the browser and
    // neither exists on the server, so reading them during the first render
    // would be a hydration mismatch — and opening the panel is the first
    // moment either one is needed.
    setCanSpeak("speechSynthesis" in window);
    try {
      setSpeechOn(sessionStorage.getItem("abyshub_chat_speech") === "1");
    } catch {
      // Private browsing can throw on access. Staying silent is the safe read.
    }

    // Focus the field once the panel has painted.
    const timer = setTimeout(() => inputRef.current?.focus(), 120);
    timers.current.push(timer);
  }

  /** Nothing should still be talking to a closed panel. */
  function handleClose() {
    setIsOpen(false);
    stopTts();
    stopBrowserSpeech();
    setSpeaking(null);
  }

  return (
    <>
      {/* Launcher — renders identically on server and client, so no basket or
          conversation state can leak into the first paint. */}
      <button
        type="button"
        onClick={isOpen ? handleClose : handleOpen}
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
            {canSpeak && (
              <button
                type="button"
                onClick={() => {
                  const next = !speechOn;
                  setSpeechOn(next);
                  // Turning it on is itself a gesture, so this is the moment
                  // the browser will honour — priming here means the very next
                  // reply can speak rather than the one after it.
                  if (next) unlockTts();
                  if (!next) {
                    stopTts();
                    stopBrowserSpeech();
                    setSpeaking(null);
                  }
                  try {
                    sessionStorage.setItem("abyshub_chat_speech", next ? "1" : "0");
                  } catch {
                    // Not being able to remember the choice is not a reason to
                    // refuse to make it.
                  }
                }}
                aria-pressed={speechOn}
                aria-label={
                  speechOn ? "Turn off spoken replies" : "Read replies aloud"
                }
                className="text-background/70 hover:text-background cursor-pointer"
              >
                {speechOn ? (
                  <Volume2Icon className="size-5" />
                ) : (
                  <VolumeXIcon className="size-5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleClose}
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
                onSpeak={canSpeak ? speak : undefined}
                speaking={speakingId === message.id}
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
