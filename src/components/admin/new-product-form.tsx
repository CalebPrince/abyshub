"use client";

import * as React from "react";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  LoaderCircleIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProduct, type ActionState } from "@/app/admin/data-actions";

export function NewProductForm({
  categories,
}: {
  categories: { slug: string; name: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = React.useActionState<ActionState, FormData>(
    createProduct,
    { error: null, notice: null }
  );

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="mt-8">
        <PlusIcon /> Add a product
      </Button>
    );
  }

  return (
    <form
      action={formAction}
      className="border-border bg-card mt-8 rounded-xl border p-5"
    >
      <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
        Add a product
      </h2>
      <p className="text-muted-foreground mt-1 mb-4 text-sm">
        It appears on the shop as soon as it is listed and in stock.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="np-name">Name</Label>
          <Input id="np-name" name="name" required className="h-10" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="np-brand">Brand</Label>
          <Input
            id="np-brand"
            name="brand"
            required
            defaultValue="Tupperware"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="np-category">Category</Label>
          <select
            id="np-category"
            name="category"
            required
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
          <Label htmlFor="np-slug">Web address</Label>
          <Input
            id="np-slug"
            name="slug"
            placeholder="left blank, made from the name"
            className="h-10"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="np-price">Price</Label>
          <Input
            id="np-price"
            name="price"
            inputMode="numeric"
            required
            placeholder="95000"
            className="h-10"
          />
          <p className="text-muted-foreground text-xs">
            Minor units — 95000 is GH₵950.00.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="np-compare">Was (optional)</Label>
          <Input
            id="np-compare"
            name="compare_at_price"
            inputMode="numeric"
            placeholder="119000"
            className="h-10"
          />
          <p className="text-muted-foreground text-xs">
            Shown struck through beside the price.
          </p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="np-tagline">Tagline</Label>
          <Input
            id="np-tagline"
            name="tagline"
            placeholder="Garri, rice and beans sealed dry for months"
            className="h-10"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="np-description">Description</Label>
          <Textarea id="np-description" name="description" rows={3} />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="np-highlights">Highlights</Label>
          <Textarea
            id="np-highlights"
            name="highlights"
            rows={3}
            placeholder={"One per line\nAirtight seal\nDishwasher safe"}
          />
          <p className="text-muted-foreground text-xs">One per line.</p>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="np-image">Photograph</Label>
          <Input
            id="np-image"
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/svg+xml"
            className="h-10 py-2"
          />
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, WebP or SVG, up to 4MB. Without one the product still
            lists, but with an empty space where the picture goes.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        {[
          { name: "published", label: "Listed", defaultChecked: true },
          { name: "in_stock", label: "In stock", defaultChecked: true },
          { name: "featured", label: "Featured", defaultChecked: false },
        ].map((box) => (
          <label className="flex items-center gap-2 text-sm" key={box.name}>
            <input
              type="checkbox"
              name={box.name}
              defaultChecked={box.defaultChecked}
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

      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending} className="h-10">
          {pending ? <LoaderCircleIcon className="animate-spin" /> : <PlusIcon />}
          Add product
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="h-10"
          onClick={() => setOpen(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
