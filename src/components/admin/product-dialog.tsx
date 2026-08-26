"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  PlusIcon,
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
import { Textarea } from "@/components/ui/textarea";
import {
  createProduct,
  deleteProduct,
  editProduct,
  type ActionState,
} from "@/app/admin/data-actions";

export type ProductDraft = {
  id: string;
  slug: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  compare_at_price: number | null;
  tagline: string | null;
  description: string | null;
  highlights: string[] | null;
  in_stock: boolean;
  featured: boolean;
  published: boolean;
};

/**
 * One dialog for both jobs.
 *
 * Adding and editing take the same fields, so they share a component rather
 * than two that drift apart. The only differences are which action runs and
 * whether the destructive half is shown at all.
 */
export function ProductDialog({
  categories,
  product,
  trigger,
}: {
  categories: { slug: string; name: string }[];
  /** Absent when adding. */
  product?: ProductDraft;
  trigger: React.ReactNode;
}) {
  const editing = Boolean(product);
  const [open, setOpen] = React.useState(false);
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    editing ? editProduct : createProduct,
    { error: null, notice: null }
  );

  // Close on success, so the table behind refreshes into view rather than
  // leaving a saved dialog sitting open over stale rows.
  //
  // Adjusted during render rather than in an effect: this is state reacting to
  // other state, not synchronisation with anything outside React, and an
  // effect here would render the dialog open for a frame before closing it.
  const [seenNotice, setSeenNotice] = React.useState<string | null>(null);
  if (state.notice !== seenNotice) {
    setSeenNotice(state.notice);
    if (state.notice) setOpen(false);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    // Never leave the delete confirmation armed for the next time it opens.
    if (!next) setConfirmingDelete(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>

      <DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto p-6">
        <DialogTitle className="font-display text-2xl font-extrabold tracking-tight uppercase">
          {editing ? "Edit product" : "Add a product"}
        </DialogTitle>
        <DialogDescription className="text-muted-foreground text-sm">
          {editing
            ? "The web address is fixed once a product exists — changing it would break every link already pointing at it."
            : "It appears on the shop as soon as it is listed and in stock."}
        </DialogDescription>

        <form action={formAction} className="mt-5">
          {editing ? <input type="hidden" name="id" value={product!.id} /> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pd-name">Name</Label>
              <Input
                id="pd-name"
                name="name"
                required
                defaultValue={product?.name}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-brand">Brand</Label>
              <Input
                id="pd-brand"
                name="brand"
                required
                defaultValue={product?.brand ?? "Tupperware"}
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-category">Category</Label>
              <select
                id="pd-category"
                name="category"
                required
                defaultValue={product?.category}
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-slug">Web address</Label>
              <Input
                id="pd-slug"
                name="slug"
                defaultValue={product?.slug}
                disabled={editing}
                placeholder="left blank, made from the name"
                className="h-10"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-price">Price</Label>
              <Input
                id="pd-price"
                name="price"
                inputMode="numeric"
                required
                defaultValue={product?.price}
                placeholder="95000"
                className="h-10"
              />
              <p className="text-muted-foreground text-xs">
                Minor units — 95000 is GH₵950.00.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pd-compare">Was (optional)</Label>
              <Input
                id="pd-compare"
                name="compare_at_price"
                inputMode="numeric"
                defaultValue={product?.compare_at_price ?? ""}
                placeholder="119000"
                className="h-10"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pd-tagline">Tagline</Label>
              <Input
                id="pd-tagline"
                name="tagline"
                defaultValue={product?.tagline ?? ""}
                className="h-10"
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pd-description">Description</Label>
              <Textarea
                id="pd-description"
                name="description"
                rows={3}
                defaultValue={product?.description ?? ""}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pd-highlights">Highlights</Label>
              <Textarea
                id="pd-highlights"
                name="highlights"
                rows={3}
                defaultValue={(product?.highlights ?? []).join("\n")}
                placeholder={"One per line\nAirtight seal\nDishwasher safe"}
              />
              <p className="text-muted-foreground text-xs">One per line.</p>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pd-image">Photograph</Label>
              <Input
                id="pd-image"
                name="image"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                className="h-10 py-2"
              />
              <p className="text-muted-foreground text-xs">
                JPEG, PNG, WebP or SVG, up to 4MB.
                {editing ? " Leave empty to keep the current picture." : null}
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-4">
            {[
              { name: "published", label: "Listed", value: product?.published ?? true },
              { name: "in_stock", label: "Available in Ghana", value: product?.in_stock ?? true },
              { name: "featured", label: "Featured", value: product?.featured ?? false },
            ].map((box) => (
              <label className="flex items-center gap-2 text-sm" key={box.name}>
                <input
                  type="checkbox"
                  name={box.name}
                  defaultChecked={box.value}
                  className="accent-primary size-4"
                />
                {box.label}
              </label>
            ))}
          </div>

          {state.error ? (
            <p role="alert" className="text-destructive mt-4 flex items-start gap-2 text-sm">
              <AlertCircleIcon className="mt-0.5 size-4 shrink-0" />
              {state.error}
            </p>
          ) : null}

          {state.notice ? (
            <p className="mt-4 flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
              <CheckCircle2Icon className="size-4" />
              {state.notice}
            </p>
          ) : null}

          <div className="mt-6 flex gap-2">
            <Button type="submit" disabled={pending} className="h-10">
              {pending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
              {editing ? "Save changes" : "Add product"}
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

        {/* Outside the form above: a nested form is invalid HTML, and this one
            posts to a different action. */}
        {editing ? (
          <div className="border-border mt-6 border-t pt-5">
            {confirmingDelete ? (
              <form action={deleteProduct} className="flex flex-wrap items-center gap-2">
                <input type="hidden" name="id" value={product!.id} />
                <p className="text-destructive w-full text-sm">
                  Delete {product!.name} for good? The description, highlights
                  and photograph go with it. Past orders are unaffected — they
                  keep their own record of what was bought and what it cost.
                </p>
                <Button type="submit" variant="destructive" size="sm" className="h-9">
                  <Trash2Icon /> Yes, delete it
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9"
                  onClick={() => setConfirmingDelete(false)}
                >
                  Keep it
                </Button>
              </form>
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive h-9"
                onClick={() => setConfirmingDelete(true)}
              >
                <Trash2Icon /> Delete product
              </Button>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
