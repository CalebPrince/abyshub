"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  DownloadCloudIcon,
  LoaderCircleIcon,
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
import { importProduct, type ActionState } from "@/app/admin/data-actions";

export function ImportProductDialog() {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    importProduct,
    { error: null, notice: null }
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DownloadCloudIcon /> Import
        </Button>
      </DialogTrigger>

      <DialogContent className="max-h-[90dvh] max-w-lg overflow-y-auto p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          Import a product
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          Reads the name, description, photograph and specification from a
          Tupperware product page. The picture is copied into your own storage
          rather than linked, so it cannot vanish later.
        </DialogDescription>

        <form action={formAction} className="mt-5 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ip-url">Product page address</Label>
            <Input
              id="ip-url"
              name="url"
              type="url"
              required
              placeholder="https://www.tupperware.com/products/…"
              className="h-10"
            />
            <p className="text-muted-foreground text-xs">
              A single product page, not a category listing.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ip-price">Your price</Label>
              <Input
                id="ip-price"
                name="price"
                inputMode="numeric"
                placeholder="95000"
                className="h-10"
              />
              <p className="text-muted-foreground text-xs">
                Minor units — 95000 is GH₵950.00.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ip-rate">…or a USD rate</Label>
              <Input
                id="ip-rate"
                name="rate"
                inputMode="decimal"
                placeholder="12.5"
                className="h-10"
              />
              <p className="text-muted-foreground text-xs">
                Cedis per dollar, to work from their list price.
              </p>
            </div>
          </div>

          <div className="border-border bg-muted/40 rounded-lg border p-3">
            <p className="text-muted-foreground text-xs">
              Imports arrive <strong>unlisted</strong>. Their prices are US
              dollars at US retail, so nothing reaches the shop until you have
              set a cedi price and listed it yourself.
            </p>
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
            <Button type="submit" disabled={pending} className="h-10">
              {pending ? (
                <LoaderCircleIcon className="animate-spin" />
              ) : (
                <DownloadCloudIcon />
              )}
              Import
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="h-10"
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
