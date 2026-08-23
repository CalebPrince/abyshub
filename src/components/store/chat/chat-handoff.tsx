"use client";

import * as React from "react";
import { CheckCircle2Icon, MessageCircleIcon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { submitEnquiry } from "@/app/enquiry/actions";
import { STORE_NAME, whatsappEnabled } from "@/lib/config";
import type { ChatMessage } from "@/lib/chat/types";

/**
 * Two routes to a human: straight to WhatsApp with the conversation attached,
 * or leave details here — which goes through the same server action as the
 * enquiry page, so there is one place to wire up your inbox.
 */
export function ChatHandoff({
  transcript,
  onClose,
}: {
  transcript: ChatMessage[];
  onClose: () => void;
}) {
  const [state, formAction, pending] = React.useActionState(submitEnquiry, {
    status: "idle" as const,
    message: null,
  });

  const conversation = transcript
    .filter((message) => message.role === "user")
    .map((message) => message.text)
    .join(" / ");

  const whatsappMessage = [
    `Hello ${STORE_NAME}, I was chatting on your site and would like to speak to someone.`,
    conversation ? `\nWhat I asked: ${conversation}` : "",
  ].join("");

  if (state.status === "sent") {
    return (
      <div className="border-foreground/12 space-y-3 rounded-xl border p-4 text-center">
        <CheckCircle2Icon className="mx-auto size-8 text-emerald-600" />
        <p className="text-sm font-semibold">Message sent</p>
        <p className="text-muted-foreground text-xs">{state.message}</p>
        <Button size="sm" variant="outline" onClick={onClose}>
          Back to chat
        </Button>
      </div>
    );
  }

  return (
    <div className="border-foreground/12 space-y-4 rounded-xl border p-4">
      {whatsappEnabled && (
        <>
          <WhatsAppLink message={whatsappMessage} className="block">
            <Button size="sm" className="w-full">
              <MessageCircleIcon /> Continue on WhatsApp
            </Button>
          </WhatsAppLink>
          <p className="text-muted-foreground text-center text-[11px] tracking-wide uppercase">
            or leave your details
          </p>
        </>
      )}

      <form action={formAction} className="space-y-3">
        {/* Gives whoever picks this up the context from the chat. */}
        <input
          type="hidden"
          name="details"
          value={
            conversation
              ? `From the site chat — asked: ${conversation}`
              : "Sent from the site chat."
          }
        />

        <div className="space-y-1.5">
          <Label htmlFor="chat-name" className="text-[11px] uppercase">
            Your name
          </Label>
          <Input id="chat-name" name="name" required className="h-9" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="chat-contact" className="text-[11px] uppercase">
            Phone or email
          </Label>
          <Input id="chat-contact" name="phone" required className="h-9" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="chat-note" className="text-[11px] uppercase">
            Anything to add
            <span className="text-muted-foreground font-normal normal-case">
              (optional)
            </span>
          </Label>
          <Textarea id="chat-note" name="note" rows={2} className="min-h-16" />
        </div>

        {state.status === "error" && state.message && (
          <p role="alert" className="text-primary text-xs">
            {state.message}
          </p>
        )}

        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            <SendIcon /> {pending ? "Sending…" : "Send"}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
