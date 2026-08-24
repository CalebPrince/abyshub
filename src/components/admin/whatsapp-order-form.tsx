"use client";

import * as React from "react";
import { CopyIcon, PlusIcon, TrashIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createWhatsAppOrder,
  type WhatsAppOrderState,
} from "@/lib/actions/admin-orders";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

type Line = { productId: string; quantity: number; unitPrice: number };

function lineFor(product: Product): Line {
  return { productId: product.id, quantity: 1, unitPrice: product.price };
}

const initialState: WhatsAppOrderState = {
  error: null,
  notice: null,
  authorizationUrl: null,
};

/**
 * Builds an order from a WhatsApp conversation. Price is editable per line —
 * bulk orders are usually negotiated, not sold at the shelf price — and on
 * success the Paystack link is shown once for staff to copy into the chat.
 * There's no WhatsApp Business API integration here, so nothing sends on its
 * own.
 */
export function WhatsAppOrderForm({ products }: { products: Product[] }) {
  const [state, formAction, pending] = React.useActionState(
    createWhatsAppOrder,
    initialState
  );

  const [lines, setLines] = React.useState<Line[]>(
    products.length > 0 ? [lineFor(products[0])] : []
  );
  const [copied, setCopied] = React.useState(false);

  const byId = React.useMemo(
    () => new Map(products.map((product) => [product.id, product])),
    [products]
  );

  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );

  function updateLine(index: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line, i) => (i === index ? { ...line, ...patch } : line))
    );
  }

  function addLine() {
    if (products.length === 0) return;
    setLines((current) => [...current, lineFor(products[0])]);
  }

  function removeLine(index: number) {
    setLines((current) => current.filter((_, i) => i !== index));
  }

  async function copyLink() {
    if (!state.authorizationUrl) return;
    await navigator.clipboard.writeText(state.authorizationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (state.authorizationUrl) {
    return (
      <div className="border-border bg-card mt-8 max-w-xl space-y-4 rounded-xl border p-6">
        <p className="font-display text-lg font-extrabold uppercase">
          Order recorded
        </p>
        <p className="text-muted-foreground text-sm">
          Copy this link and paste it into the WhatsApp chat. Once the
          customer pays, it settles automatically like any card order.
        </p>
        <div className="border-input bg-muted/40 flex items-center gap-2 rounded-lg border p-3">
          <code className="min-w-0 flex-1 truncate text-xs">
            {state.authorizationUrl}
          </code>
          <Button type="button" size="sm" variant="outline" onClick={copyLink}>
            <CopyIcon /> {copied ? "Copied" : "Copy"}
          </Button>
        </div>
        <Button asChild variant="ghost" size="sm">
          <a href="/admin/orders">Back to orders</a>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="mt-8 max-w-2xl space-y-8">
      <input type="hidden" name="lines" value={JSON.stringify(lines)} />

      <section className="space-y-5">
        <h2 className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          Customer
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id="name" label="Full name" />
          <Field id="phone" label="Phone number" type="tel" />
          <Field
            id="email"
            label="Email"
            type="email"
            required={false}
            hint="Left blank, one is generated from the phone number"
            className="sm:col-span-2"
          />
          <Field
            id="address"
            label="Delivery address"
            required={false}
            className="sm:col-span-2"
          />
          <Field id="city" label="City" required={false} />
          <Field
            id="delivery"
            label="Delivery fee"
            type="number"
            required={false}
            hint="Arranged separately for bulk orders — defaults to 0"
          />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
          Items
        </h2>

        <div className="space-y-3">
          {lines.map((line, index) => (
            <div
              key={index}
              className="border-border grid grid-cols-1 gap-3 rounded-xl border p-4 sm:grid-cols-[1fr_5rem_7rem_2.5rem]"
            >
              <Select
                value={line.productId}
                onValueChange={(value) => {
                  const next = byId.get(value);
                  updateLine(index, {
                    productId: value,
                    unitPrice: next ? next.price : line.unitPrice,
                  });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.brand} — {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                value={line.quantity}
                aria-label="Quantity"
                onChange={(event) =>
                  updateLine(index, {
                    quantity: Math.max(1, Number(event.target.value) || 1),
                  })
                }
              />

              <Input
                type="number"
                min={0}
                step="0.01"
                value={(line.unitPrice / 100).toFixed(2)}
                aria-label="Price"
                onChange={(event) =>
                  updateLine(index, {
                    unitPrice: Math.round((Number(event.target.value) || 0) * 100),
                  })
                }
              />

              <Button
                type="button"
                size="icon"
                variant="ghost"
                disabled={lines.length === 1}
                onClick={() => removeLine(index)}
                aria-label="Remove line"
              >
                <TrashIcon />
              </Button>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" size="sm" onClick={addLine}>
          <PlusIcon /> Add product
        </Button>

        <p className="text-muted-foreground text-sm">
          Subtotal:{" "}
          <span className="text-foreground font-semibold">
            {formatPrice(subtotal)}
          </span>
        </p>
      </section>

      {state.error && (
        <p
          role="alert"
          className="border-primary text-primary rounded-r-lg border-l-4 py-2 pl-4 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.notice && (
        <p className="border-primary/40 text-muted-foreground rounded-r-lg border-l-4 py-2 pl-4 text-sm">
          {state.notice}
        </p>
      )}

      <Button type="submit" size="lg" disabled={pending || lines.length === 0}>
        {pending ? "Recording…" : "Record order & generate link"}
      </Button>
    </form>
  );
}

function Field({
  id,
  label,
  type = "text",
  required = true,
  hint,
  className,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
  className?: string;
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
      <Input id={id} name={id} type={type} required={required} step={type === "number" ? "0.01" : undefined} />
      {hint && <p className="text-muted-foreground text-xs">{hint}</p>}
    </div>
  );
}
