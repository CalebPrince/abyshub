import Link from "next/link";
import type { Metadata } from "next";
import {
  CheckCircle2Icon,
  CircleAlertIcon,
  ClockIcon,
  PackageCheckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/store/clear-cart-on-mount";
import { PrintReceiptButton } from "@/components/store/print-receipt-button";
import { formatPriceExact } from "@/lib/money";
import { verifyTransaction } from "@/lib/paystack";

export const metadata: Metadata = {
  title: "Payment result",
  robots: { index: false },
};

/** Paystack sends the customer back here with ?reference=... */
export default async function CheckoutCallbackPage({
  searchParams,
}: PageProps<"/checkout/callback">) {
  const params = await searchParams;
  const reference =
    typeof params.reference === "string"
      ? params.reference
      : typeof params.trxref === "string"
        ? params.trxref
        : null;

  if (!reference) {
    return (
      <Result
        tone="error"
        title="No payment to check"
        body="We did not get a payment reference back from Paystack."
      />
    );
  }

  const result = await verifyTransaction(reference);

  if (!result.ok) {
    return (
      <Result
        tone="error"
        title="We could not confirm that payment"
        body={`${result.error} Keep your reference (${reference}) and contact us — we will check it manually.`}
      />
    );
  }

  const { transaction } = result;

  if (transaction.status === "success") {
    const metadata = transaction.metadata ?? {};
    const fulfilmentMethod =
      metadata.fulfilment_method === "pickup" ? "pickup" : "delivery";
    const collectionCode = textValue(metadata.collection_code);
    const items = receiptItems(metadata.items);

    return (
      <>
        <ClearCartOnMount />
        <Receipt
          reference={transaction.reference}
          amount={transaction.amount}
          currency={transaction.currency}
          paidAt={transaction.paidAt}
          name={textValue(metadata.customer_name)}
          phone={textValue(metadata.phone)}
          address={textValue(metadata.address)}
          city={textValue(metadata.city)}
          fulfilmentMethod={fulfilmentMethod}
          collectionCode={collectionCode}
          subtotal={numberValue(metadata.subtotal)}
          delivery={numberValue(metadata.delivery)}
          items={items}
        />
      </>
    );
  }

  if (transaction.status === "abandoned" || transaction.status === "failed") {
    return (
      <Result
        tone="error"
        title="That payment did not go through"
        body="Nothing was charged. Your basket is still here, so you can try again or order another way."
        reference={transaction.reference}
      />
    );
  }

  return (
    <Result
      tone="pending"
      title="Payment still processing"
      body="Paystack has not settled this one yet. We will confirm as soon as it clears."
      reference={transaction.reference}
    />
  );
}

type ReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
};

function textValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function receiptItems(value: unknown): ReceiptItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ReceiptItem[] => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = textValue(row.name);
    const quantity = numberValue(row.quantity);
    const unitPrice = numberValue(row.unit_price);
    if (!name || quantity === undefined || unitPrice === undefined) return [];
    return [{ name, quantity, unitPrice }];
  });
}

function Receipt({
  reference,
  amount,
  currency,
  paidAt,
  name,
  phone,
  address,
  city,
  fulfilmentMethod,
  collectionCode,
  subtotal,
  delivery,
  items,
}: {
  reference: string;
  amount: number;
  currency: string;
  paidAt: string | null;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  fulfilmentMethod: "delivery" | "pickup";
  collectionCode?: string;
  subtotal?: number;
  delivery?: number;
  items: ReceiptItem[];
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 print:max-w-none print:p-0 lg:py-24">
      <div className="border-foreground/12 overflow-hidden rounded-2xl border bg-background print:rounded-none print:border-0">
        <header className="bg-primary text-primary-foreground flex flex-col gap-5 p-7 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] uppercase opacity-70">
              Payment receipt
            </p>
            <h1 className="font-display mt-2 text-3xl font-extrabold tracking-tight uppercase">
              Order confirmed
            </h1>
          </div>
          <CheckCircle2Icon className="size-12" aria-hidden="true" />
        </header>

        <div className="space-y-8 p-7 sm:p-10">
          {/* Only ever the real code. Deriving one from the reference used to
              fill this space for orders that have none — which reads as
              reassuring and is worse than useless: staff are handed no such
              code to check it against. */}
          {collectionCode ? (
            <div className="bg-muted/60 border-foreground/10 rounded-xl border p-6 text-center">
              <PackageCheckIcon className="text-primary mx-auto size-7" />
              <p className="text-muted-foreground mt-3 text-xs font-semibold tracking-[0.18em] uppercase">
                Show this code on {fulfilmentMethod}
              </p>
              <p className="font-display mt-2 text-4xl font-black tracking-[0.18em] sm:text-5xl">
                {collectionCode}
              </p>
              <p className="text-muted-foreground mt-3 text-xs">
                Keep this code private. Staff will ask for it before handing over your order.
              </p>
            </div>
          ) : null}

          <div className="grid gap-6 text-sm sm:grid-cols-2">
            <div>
              <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Receipt details
              </h2>
              <dl className="mt-3 space-y-2">
                <ReceiptRow label="Reference" value={reference} mono />
                <ReceiptRow
                  label="Paid"
                  value={paidAt ? new Date(paidAt).toLocaleString() : "Confirmed"}
                />
                <ReceiptRow
                  label="Method"
                  value={fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"}
                />
              </dl>
            </div>
            <div>
              <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Customer
              </h2>
              <div className="mt-3 space-y-1">
                {name ? <p className="font-semibold">{name}</p> : null}
                {phone ? <p>{phone}</p> : null}
                {fulfilmentMethod === "delivery" && address ? (
                  <p className="text-muted-foreground">
                    {address}{city ? `, ${city}` : ""}
                  </p>
                ) : null}
              </div>
            </div>
          </div>

          {items.length > 0 ? (
            <div>
              <h2 className="text-muted-foreground text-[11px] font-semibold tracking-[0.16em] uppercase">
                Items
              </h2>
              <ul className="border-foreground/12 mt-3 divide-y rounded-xl border">
                {items.map((item, index) => (
                  <li key={`${item.name}-${index}`} className="flex justify-between gap-4 p-4 text-sm">
                    <span>{item.quantity} × {item.name}</span>
                    <span className="shrink-0 tabular-nums">
                      {formatPriceExact(item.quantity * item.unitPrice, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <dl className="border-foreground/12 ml-auto max-w-sm space-y-2 border-t pt-5 text-sm">
            {subtotal !== undefined ? (
              <ReceiptRow label="Subtotal" value={formatPriceExact(subtotal, currency)} />
            ) : null}
            {delivery !== undefined ? (
              <ReceiptRow
                label="Delivery"
                value={delivery === 0 ? "Free" : formatPriceExact(delivery, currency)}
              />
            ) : null}
            <div className="flex items-baseline justify-between gap-4 pt-2">
              <dt className="font-display font-bold uppercase">Total paid</dt>
              <dd className="font-display text-xl font-extrabold tabular-nums">
                {formatPriceExact(amount, currency)}
              </dd>
            </div>
          </dl>

          <div className="flex flex-wrap justify-center gap-3 print:hidden">
            <Button asChild>
              <Link href="/products">Keep shopping</Link>
            </Button>
            <PrintReceiptButton />
          </div>
        </div>
      </div>
    </div>
  );
}

function ReceiptRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={mono ? "font-mono text-xs font-medium" : "text-right font-medium"}>{value}</dd>
    </div>
  );
}

function Result({
  tone,
  title,
  body,
  reference,
  amount,
  currency,
}: {
  tone: "success" | "error" | "pending";
  title: string;
  body: string;
  reference?: string;
  amount?: number;
  currency?: string;
}) {
  const Icon =
    tone === "success"
      ? CheckCircle2Icon
      : tone === "pending"
        ? ClockIcon
        : CircleAlertIcon;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 lg:py-28">
      <div className="border-foreground/12 rounded-xl border p-8 text-center sm:p-12">
        <Icon
          className={
            tone === "success"
              ? "mx-auto size-12 text-emerald-600"
              : tone === "pending"
                ? "text-muted-foreground mx-auto size-12"
                : "text-primary mx-auto size-12"
          }
        />

        <h1 className="font-display mt-6 text-3xl font-extrabold tracking-tight uppercase">
          {title}
        </h1>
        <p className="text-muted-foreground mx-auto mt-3 max-w-md">{body}</p>

        {reference && (
          <dl className="border-foreground/12 mx-auto mt-8 max-w-xs space-y-2 border-t pt-6 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Reference</dt>
              <dd className="font-mono font-medium">{reference}</dd>
            </div>
            {amount !== undefined && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground">Amount</dt>
                <dd className="font-medium tabular-nums">
                  {formatPriceExact(amount, currency)}
                </dd>
              </div>
            )}
          </dl>
        )}

        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Button asChild>
            <Link href="/products">Keep shopping</Link>
          </Button>
          {tone !== "success" && (
            <Button asChild variant="outline">
              <Link href="/checkout">Back to checkout</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
