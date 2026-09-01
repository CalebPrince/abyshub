"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2Icon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitEnquiry } from "@/lib/actions/enquiry";

export function ContactForm() {
  const [state, formAction, pending] = React.useActionState(submitEnquiry, {
    status: "idle" as const,
    message: null,
  });

  if (state.status === "sent") {
    return (
      <div className="border-foreground/12 bg-background rounded-2xl border p-8 text-center shadow-sm sm:p-12">
        <CheckCircle2Icon className="mx-auto size-11 text-emerald-600" />
        <h2 className="font-display mt-5 text-2xl font-extrabold tracking-tight uppercase">
          Message received
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm">{state.message}</p>
        <Button asChild variant="outline" className="mt-7">
          <Link href="/">Back to the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="border-foreground/12 bg-background rounded-2xl border p-5 shadow-sm sm:p-8">
      <input type="hidden" name="kind" value="contact" />
      <div className="border-foreground/10 mb-7 flex items-center justify-between border-b pb-4">
        <div>
          <p className="text-primary text-[10px] font-bold tracking-[0.2em] uppercase">Message docket</p>
          <p className="text-muted-foreground mt-1 text-xs">Sent directly to the Abys Hub inbox</p>
        </div>
        <span className="bg-primary/10 text-primary rounded-full px-3 py-1 text-[10px] font-bold tracking-wider uppercase">New</span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ContactField id="name" label="Your name" autoComplete="name" />
        <ContactField id="phone" label="Phone number" type="tel" autoComplete="tel" required={false} />
        <ContactField id="email" label="Email address" type="email" autoComplete="email" required={false} className="sm:col-span-2" />
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="subject" className="text-[11px] font-semibold tracking-[0.12em] uppercase">Subject</Label>
        <Input id="subject" name="subject" required maxLength={120} placeholder="What is this about?" />
      </div>

      <div className="mt-5 space-y-2">
        <Label htmlFor="details" className="text-[11px] font-semibold tracking-[0.12em] uppercase">Your message</Label>
        <Textarea id="details" name="details" required rows={7} maxLength={2000} placeholder="Tell us how we can help…" className="resize-y" />
      </div>

      {state.status === "error" && state.message ? (
        <p role="alert" className="border-primary text-primary mt-5 border-l-4 py-2 pl-4 text-sm">{state.message}</p>
      ) : null}

      <Button type="submit" size="lg" disabled={pending} className="mt-6 w-full sm:w-auto">
        <SendIcon /> {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}

function ContactField({ id, label, type = "text", autoComplete, required = true, className = "" }: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={`space-y-2 ${className}`}>
      <Label htmlFor={id} className="text-[11px] font-semibold tracking-[0.12em] uppercase">
        {label}{!required ? <span className="text-muted-foreground ml-1 font-normal normal-case">(optional)</span> : null}
      </Label>
      <Input id={id} name={id} type={type} autoComplete={autoComplete} required={required} />
    </div>
  );
}
