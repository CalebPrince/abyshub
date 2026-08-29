"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recoverPaidOrder } from "@/app/admin/data-actions";
import type { ActionState } from "@/app/admin/data-actions";

/**
 * Rebuilds an order for a payment Paystack took but never delivered a webhook
 * for. Folded away by default — it exists for the rare morning after a
 * misconfiguration, not for daily use, and an always-open box inviting staff
 * to type references would get used as a general order-entry form.
 */
export function RecoverOrderForm() {
  const [open, setOpen] = React.useState(false);
  const [state, action, pending] = React.useActionState<ActionState, FormData>(
    recoverPaidOrder,
    { error: null, notice: null }
  );

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground mt-6 text-xs underline underline-offset-4"
      >
        A payment is missing from this list
      </button>
    );
  }

  return (
    <div className="border-border bg-muted/30 mt-6 rounded-xl border p-5">
      <p className="text-[11px] font-semibold tracking-[0.14em] uppercase">
        Recover a payment
      </p>
      <p className="text-muted-foreground mt-2 max-w-2xl text-sm">
        For a charge Paystack settled but never sent us. Paste the reference
        from the Paystack receipt — the amount, items and handover code are read
        back from Paystack, not from anything typed here. The customer is not
        emailed.
      </p>

      <form action={action} className="mt-4 flex flex-wrap items-center gap-2">
        <Input
          name="reference"
          placeholder="AH-XXXXXXXX-XXXXXX"
          aria-label="Payment reference"
          required
          className="h-9 w-full max-w-xs font-mono text-xs"
        />
        <Button type="submit" size="sm" className="h-9" disabled={pending}>
          {pending ? <LoaderCircleIcon className="animate-spin" /> : null}
          Recover
        </Button>
      </form>

      {state.error ? (
        <p role="alert" className="text-destructive mt-3 flex items-start gap-2 text-sm">
          <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
          {state.error}
        </p>
      ) : null}

      {state.notice ? (
        <p className="mt-3 flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
          {state.notice}
        </p>
      ) : null}
    </div>
  );
}
