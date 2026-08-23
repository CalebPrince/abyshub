"use client";

import Image from "next/image";
import Link from "next/link";
import { MessageCircleIcon, ShoppingBasketIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { OrderSummary } from "@/components/store/order-summary";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { useCart } from "@/components/store/cart-provider";
import { formatPrice } from "@/lib/money";
import { buildWhatsAppOrder } from "@/lib/whatsapp-message";

export function CartView() {
  const { lines, hydrated, updateQuantity, removeItem, clearCart, totals } =
    useCart();

  if (!hydrated) {
    return (
      <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <div className="border-foreground/12 mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <ShoppingBasketIcon className="text-muted-foreground size-10" />
        <p className="font-display text-xl font-extrabold uppercase">
          Your basket is empty
        </p>
        <p className="text-muted-foreground -mt-2 text-sm">
          Whatever you add shows up here.
        </p>
        <Button asChild>
          <Link href="/products">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-10 grid items-start gap-10 lg:grid-cols-[1fr_380px]">
      <div className="space-y-5">
        <ul className="border-foreground/12 divide-foreground/12 divide-y overflow-hidden rounded-xl border">
          {lines.map((line) => (
            <li key={line.productId} className="flex gap-4 p-4 sm:p-5">
              <Link
                href={`/products/${line.product.slug}`}
                className="bg-muted relative size-24 shrink-0 overflow-hidden rounded-lg sm:size-32"
              >
                <Image
                  src={line.product.image}
                  alt={line.product.name}
                  fill
                  sizes="128px"
                  className="object-cover"
                />
              </Link>

              <div className="flex min-w-0 flex-1 flex-col justify-between gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.14em] uppercase">
                      {line.product.brand}
                    </p>
                    <Link
                      href={`/products/${line.product.slug}`}
                      className="font-display block leading-tight font-bold hover:underline"
                    >
                      {line.product.name}
                    </Link>
                    <p className="text-muted-foreground text-sm tabular-nums">
                      {formatPrice(line.product.price)} each
                    </p>
                  </div>
                  <span className="font-display font-extrabold whitespace-nowrap tabular-nums">
                    {formatPrice(line.product.price * line.quantity)}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <QuantityStepper
                    quantity={line.quantity}
                    onChange={(quantity) =>
                      updateQuantity(line.productId, quantity)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-primary"
                    onClick={() => removeItem(line.productId)}
                  >
                    <Trash2Icon /> Remove
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between">
          <Button asChild variant="outline">
            <Link href="/products">Keep shopping</Link>
          </Button>
          <Button
            variant="ghost"
            className="text-muted-foreground hover:text-primary"
            onClick={clearCart}
          >
            Empty basket
          </Button>
        </div>
      </div>

      <aside className="border-foreground/12 space-y-5 rounded-xl border p-6 lg:sticky lg:top-32">
        <h2 className="font-display text-lg font-extrabold tracking-tight uppercase">
          Summary
        </h2>
        <div className="border-foreground/12 border-t pt-5">
          <OrderSummary />
        </div>

        <div className="space-y-2.5">
          <Button asChild size="lg" className="w-full">
            <Link href="/checkout">Checkout</Link>
          </Button>

          <WhatsAppLink
            message={buildWhatsAppOrder(lines, totals)}
            className="block"
          >
            <Button variant="outline" size="lg" className="w-full">
              <MessageCircleIcon /> Order on WhatsApp
            </Button>
          </WhatsAppLink>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/enquiry">Request a quote instead</Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}
