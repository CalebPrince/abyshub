"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2Icon, SendIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/components/store/cart-provider";
import { submitEnquiry } from "@/app/enquiry/actions";
import { cn } from "@/lib/utils";

export function EnquiryForm() {
  const { items, lines } = useCart();
  const [state, formAction, pending] = React.useActionState(submitEnquiry, {
    status: "idle" as const,
    message: null,
  });

  if (state.status === "sent") {
    return (
      <div className="border-foreground/12 mt-10 rounded-xl border p-8 text-center sm:p-12">
        <CheckCircle2Icon className="mx-auto size-12 text-emerald-600" />
        <h2 className="font-display mt-6 text-2xl font-extrabold tracking-tight uppercase">
          Enquiry sent
        </h2>
        <p className="text-muted-foreground mx-auto mt-3 max-w-sm">
          {state.message}
        </p>
        <Button asChild className="mt-8">
          <Link href="/products">Keep browsing</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-10 max-w-2xl space-y-7">
      <input type="hidden" name="cart" value={JSON.stringify(items)} />

      {lines.length > 0 && (
        <div className="border-foreground/12 rounded-xl border p-5">
          <p className="text-primary text-[11px] font-semibold tracking-[0.16em] uppercase">
            Attached to this enquiry
          </p>
          <ul className="text-muted-foreground mt-3 space-y-1 text-sm">
            {lines.map((line) => (
              <li key={line.productId}>
                {line.product.name} × {line.quantity}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Your name" autoComplete="name" />
        <Field id="phone" label="Phone" type="tel" autoComplete="tel" required={false} />
        <Field
          id="email"
          label="Email"
          type="email"
          autoComplete="email"
          required={false}
          className="sm:col-span-2"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="details"
          className="text-[11px] font-semibold tracking-[0.12em] uppercase"
        >
          What do you need?
        </Label>
        <Textarea
          id="details"
          name="details"
          required
          rows={5}
          placeholder="Quantities, delivery location, the date you need it by…"
        />
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="border-primary text-primary border-l-4 py-2 pl-4 text-sm"
        >
          {state.message}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending}>
        <SendIcon /> {pending ? "Sending…" : "Send enquiry"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  autoComplete,
  className,
  required = true,
}: {
  id: string;
  label: string;
  type?: string;
  autoComplete?: string;
  className?: string;
  required?: boolean;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label
        htmlFor={id}
        className="text-[11px] font-semibold tracking-[0.12em] uppercase"
      >
        {label}
        {!required && (
          <span className="text-muted-foreground font-normal normal-case">
            (optional)
          </span>
        )}
      </Label>
      <Input
        id={id}
        name={id}
        type={type}
        autoComplete={autoComplete}
        required={required}
      />
    </div>
  );
}
