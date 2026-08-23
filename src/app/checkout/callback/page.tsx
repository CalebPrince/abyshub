import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2Icon, CircleAlertIcon, ClockIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ClearCartOnMount } from "@/components/store/clear-cart-on-mount";
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
    return (
      <>
        <ClearCartOnMount />
        <Result
          tone="success"
          title="Payment received"
          body="Thank you. We are packing your order and will be in touch about delivery."
          reference={transaction.reference}
          amount={transaction.amount}
          currency={transaction.currency}
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
      <div className="border-foreground/12 border p-8 text-center sm:p-12">
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
