"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  CreditCardIcon,
  FileTextIcon,
  LockIcon,
  MessageCircleIcon,
  StoreIcon,
  TruckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderSummary } from "@/components/store/order-summary";
import { useCart } from "@/components/store/cart-provider";
import { startPaystackCheckout } from "@/lib/actions/checkout";
import { whatsappEnabled } from "@/lib/config";
import { formatPrice, formatPriceExact } from "@/lib/money";
import { buildWhatsAppOrder } from "@/lib/whatsapp-message";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { cn } from "@/lib/utils";

type Method = "card" | "whatsapp" | "enquiry";
type FulfilmentMethod = "delivery" | "pickup";

export function CheckoutForm({
  paystackReady,
}: {
  paystackReady: boolean;
}) {
  const { lines, items, hydrated, totals } = useCart();
  const [method, setMethod] = React.useState<Method>(
    paystackReady ? "card" : "whatsapp"
  );
  const [fulfilmentMethod, setFulfilmentMethod] =
    React.useState<FulfilmentMethod>("delivery");

  const [state, formAction, pending] = React.useActionState(
    startPaystackCheckout,
    { error: null }
  );
  const checkoutTotals =
    fulfilmentMethod === "pickup"
      ? { ...totals, delivery: 0, total: totals.subtotal }
      : totals;

  if (!hydrated) {
    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <Skeleton className="h-[28rem] w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border-foreground/12 mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed py-20 text-center">
        <p className="font-display text-xl font-extrabold uppercase">
          Nothing to check out
        </p>
        <p className="text-muted-foreground -mt-1 text-sm">
          Put something in your basket first.
        </p>
        <Button asChild>
          <Link href="/products">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  const methods: {
    id: Method;
    icon: typeof CreditCardIcon;
    title: string;
    body: string;
    available: boolean;
  }[] = [
    {
      id: "card",
      icon: CreditCardIcon,
      title: "Pay By Card or Mobile Money",
      body: "Card, MTN MoMo, Telecel Cash, AirtelTigo Money, transfer or USSD",
      available: paystackReady,
    },
    {
      id: "whatsapp",
      icon: MessageCircleIcon,
      title: "Order on WhatsApp",
      body: "Send us the basket, pay on confirmation",
      available: whatsappEnabled,
    },
    {
      id: "enquiry",
      icon: FileTextIcon,
      title: "Request a quote",
      body: "For bulk orders and events",
      available: true,
    },
  ];
  const whatsappOrderMessage = `${buildWhatsAppOrder(lines, checkoutTotals)}\n\nFulfilment: ${
    fulfilmentMethod === "pickup" ? "Pickup" : "Delivery"
  }`;

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-8">
        <fieldset>
          <legend className="text-primary mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase">
            01 How will you receive it?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {([
              {
                id: "delivery" as const,
                icon: TruckIcon,
                title: "Delivery",
                body: "We bring the order to your address",
              },
              {
                id: "pickup" as const,
                icon: StoreIcon,
                title: "Pickup",
                body: "Collect it from Abys Hub with your receipt code",
              },
            ]).map((option) => (
              <label
                key={option.id}
                className={cn(
                  "border-foreground/12 flex cursor-pointer items-start gap-4 rounded-xl border p-5 transition-colors",
                  fulfilmentMethod === option.id
                    ? "border-primary bg-primary/6 ring-primary/20 ring-2"
                    : "hover:border-foreground/40"
                )}
              >
                <input
                  type="radio"
                  name="fulfilment-choice"
                  value={option.id}
                  checked={fulfilmentMethod === option.id}
                  onChange={() => setFulfilmentMethod(option.id)}
                  className="sr-only"
                />
                <option.icon className="text-primary mt-0.5 size-6 shrink-0" />
                <span>
                  <span className="font-display block font-bold tracking-tight uppercase">
                    {option.title}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {option.body}
                  </span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* ── Method picker ── */}
        <fieldset>
          <legend className="text-primary mb-4 text-[11px] font-semibold tracking-[0.2em] uppercase">
            02 How would you like to pay?
          </legend>

          <div className="grid gap-px sm:grid-cols-3">
            {methods.map((option) => (
              <label
                key={option.id}
                className={cn(
                  "border-foreground/12 relative flex cursor-pointer flex-col gap-2 rounded-xl border p-5 transition-colors",
                  method === option.id
                    ? "bg-primary text-primary-foreground"
                    : "hover:border-foreground/40",
                  !option.available && "cursor-not-allowed opacity-45"
                )}
              >
                <input
                  type="radio"
                  name="method"
                  value={option.id}
                  checked={method === option.id}
                  disabled={!option.available}
                  onChange={() => setMethod(option.id)}
                  className="sr-only"
                />
                <option.icon
                  className={cn(
                    "size-6",
                    method === option.id ? "text-primary" : "text-primary"
                  )}
                />
                <span className="font-display font-bold tracking-tight uppercase">
                  {option.title}
                </span>
                <span
                  className={cn(
                    "text-xs",
                    method === option.id
                      ? "text-background/65"
                      : "text-muted-foreground"
                  )}
                >
                  {option.available ? option.body : "Not available yet"}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {method === "card" && (
          <form action={formAction} className="space-y-8">
            {/* Ids and quantities only, the server prices the order itself. */}
            <input type="hidden" name="cart" value={JSON.stringify(items)} />
            <input
              type="hidden"
              name="fulfilment_method"
              value={fulfilmentMethod}
            />

            <section className="space-y-5">
              <h2 className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
                03 {fulfilmentMethod === "delivery" ? "Delivery" : "Contact"} details
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id="name" label="Full name" autoComplete="name" />
                <Field
                  id="phone"
                  label="Phone number"
                  type="tel"
                  autoComplete="tel"
                />
                <Field
                  id="email"
                  label="Email"
                  type="email"
                  autoComplete="email"
                  className="sm:col-span-2"
                />
                {fulfilmentMethod === "delivery" ? (
                  <>
                    <Field
                      id="address"
                      label="Delivery address"
                      autoComplete="street-address"
                      className="sm:col-span-2"
                    />
                    <Field id="city" label="City" autoComplete="address-level2" />
                    <Field
                      id="state"
                      label="State"
                      autoComplete="address-level1"
                      required={false}
                    />
                  </>
                ) : null}
              </div>
            </section>

            {state.error && (
              <p
                role="alert"
                className="border-primary text-primary rounded-r-lg border-l-4 py-2 pl-4 text-sm"
              >
                {state.error}
              </p>
            )}

            <div className="space-y-4">
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={pending}
              >
                <LockIcon />
                {pending
                  ? "Opening Paystack…"
                  : `Pay ${formatPriceExact(
                      fulfilmentMethod === "pickup"
                        ? totals.subtotal
                        : totals.total
                    )}`}
              </Button>
              <p className="text-muted-foreground flex items-start gap-2 text-xs">
                <LockIcon className="mt-0.5 size-3.5 shrink-0" />
                You will be taken to Paystack to pay by card or mobile money:
                MTN MoMo, Telecel Cash or AirtelTigo Money. Your details are
                entered on Paystack&apos;s page and never touch this site.
              </p>
            </div>
          </form>
        )}

        {method === "whatsapp" && (
          <section className="space-y-5">
            <h2 className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              02 Send us your basket
            </h2>
            <p className="text-muted-foreground text-sm">
              This opens WhatsApp with your basket already written out. We reply
              with availability, delivery cost and how to pay.
            </p>

            <pre className="border-foreground/12 text-muted-foreground bg-muted/40 max-h-56 overflow-auto rounded-xl border p-4 font-mono text-xs whitespace-pre-wrap">
              {whatsappOrderMessage}
            </pre>

            <WhatsAppLink message={whatsappOrderMessage}>
              <Button size="lg" className="w-full sm:w-auto">
                <MessageCircleIcon /> Send this order on WhatsApp
              </Button>
            </WhatsAppLink>
          </section>
        )}

        {method === "enquiry" && (
          <section className="space-y-5">
            <h2 className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase">
              02 Ask us for a price
            </h2>
            <p className="text-muted-foreground text-sm">
              Buying in quantity, or for an event? Send the basket as an enquiry
              and we will come back with a quote, including delivery.
            </p>
            <Button asChild size="lg">
              <Link href="/enquiry">
                <FileTextIcon /> Continue to the enquiry form
              </Link>
            </Button>
          </section>
        )}
      </div>

      {/* ── Order panel ── */}
      <aside className="border-foreground/12 space-y-5 rounded-xl border p-6 lg:sticky lg:top-32">
        <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
          Your order
        </h2>

        <ul className="space-y-3.5">
          {lines.map((line) => (
            <li key={line.productId} className="flex items-center gap-3">
              <div className="bg-muted relative size-14 shrink-0 overflow-hidden rounded-lg">
                <Image
                  src={line.product.image}
                  alt={line.product.name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
                <span className="bg-primary text-primary-foreground absolute top-0 right-0 flex size-5 items-center justify-center rounded-full text-[10px] font-bold">
                  {line.quantity}
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {line.product.name}
                </p>
                <p className="text-muted-foreground text-xs">
                  {line.product.brand}
                </p>
              </div>
              <span className="text-sm font-medium whitespace-nowrap tabular-nums">
                {formatPrice(line.product.price * line.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="border-foreground/12 border-t pt-5">
          <OrderSummary pickup={fulfilmentMethod === "pickup"} />
        </div>

        <Button asChild variant="ghost" className="w-full">
          <Link href="/cart">Edit basket</Link>
        </Button>
      </aside>
    </div>
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
