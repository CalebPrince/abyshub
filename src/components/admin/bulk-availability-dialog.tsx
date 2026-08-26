"use client";

import * as React from "react";
import { AlertCircleIcon, CheckCircle2Icon, LoaderCircleIcon, MapPinIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { setGhanaAvailability, type ActionState } from "@/app/admin/data-actions";
import { SUPPLIERS } from "@/lib/suppliers/registry";

/**
 * Sets every product from one partner at once, instead of one product at a
 * time — for the moment staff have actually checked the partner's real Ghana
 * channel and want that verdict applied across the board.
 */
export function BulkAvailabilityDialog() {
  const [open, setOpen] = React.useState(false);
  const [supplierId, setSupplierId] = React.useState(SUPPLIERS[0]?.id ?? "");
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    setGhanaAvailability,
    { error: null, notice: null }
  );

  const supplier = SUPPLIERS.find((s) => s.id === supplierId);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MapPinIcon /> Ghana stock
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          Mark Ghana availability
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          Applies to every product from the chosen partner. Check their real
          channel first — nothing here checks it for you.
        </DialogDescription>

        <form action={formAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ba-supplier">Partner</Label>
            <select
              id="ba-supplier"
              name="supplier"
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
            >
              {SUPPLIERS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {supplier ? (
            <div className="border-border bg-muted/40 rounded-lg border p-3">
              <p className="text-muted-foreground text-xs">{supplier.ghanaCheck.note}</p>
              {supplier.ghanaCheck.links?.length ? (
                <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {supplier.ghanaCheck.links.map((link) => (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary font-medium underline underline-offset-2"
                    >
                      {link.label}
                    </a>
                  ))}
                </p>
              ) : null}
            </div>
          ) : null}

          {state.error ? (
            <p role="alert" className="text-destructive flex items-start gap-2 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          {state.notice ? (
            <p className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="mt-0.5 size-4 shrink-0" />
              {state.notice}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button
              type="submit"
              name="available"
              value="yes"
              disabled={pending}
              className="h-10"
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <MapPinIcon />}
              Mark all available
            </Button>
            <Button
              type="submit"
              name="available"
              value="no"
              variant="outline"
              disabled={pending}
              className="h-10"
            >
              Mark all unconfirmed
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Close
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
