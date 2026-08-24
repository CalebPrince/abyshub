"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  Trash2Icon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAllProducts, type ActionState } from "@/app/admin/data-actions";

const PHRASE = "DELETE ALL";

/**
 * Empties the catalogue.
 *
 * Typed confirmation rather than a click, because there is no undo and the
 * blast radius is the whole shop. The button stays disabled until the phrase
 * matches, so the dangerous action is never one stray keypress away.
 */
export function DeleteAllProducts({ count }: { count: number }) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");

  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    deleteAllProducts,
    { error: null, notice: null }
  );

  // Adjusted during render rather than in an effect: state reacting to state.
  const [seen, setSeen] = React.useState<string | null>(null);
  if (state.notice !== seen) {
    setSeen(state.notice);
    if (state.notice) setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setTyped("");
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
          <Trash2Icon /> Delete all
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          Empty the catalogue
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          This deletes all {count} product{count === 1 ? "" : "s"} and the
          pictures uploaded with them. There is no undo.
        </DialogDescription>

        <div className="border-border bg-muted/40 mt-4 rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">
            Past orders are unaffected — each one keeps its own record of what
            was bought and what it cost, so order history still reads correctly
            against an empty catalogue.
          </p>
        </div>

        <form action={formAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="da-confirm">
              Type <span className="font-mono font-semibold">{PHRASE}</span> to
              confirm
            </Label>
            <Input
              id="da-confirm"
              name="confirm"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="h-10 font-mono"
            />
          </div>

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

          <div className="flex gap-2">
            <Button
              type="submit"
              variant="destructive"
              className="h-10"
              disabled={pending || typed !== PHRASE}
            >
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <Trash2Icon />}
              Delete all {count}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
