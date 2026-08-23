"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, Trash2Icon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { useCart } from "@/components/store/cart-provider";
import { formatPrice } from "@/lib/money";

export function CartSheet() {
  const { lines, isOpen, setOpen, updateQuantity, removeItem, totals, itemCount } =
    useCart();

  return (
    <Sheet open={isOpen} onOpenChange={setOpen}>
      <SheetContent className="w-full gap-0 sm:max-w-md">
        <SheetHeader className="border-b">
          <SheetTitle className="font-display text-lg font-extrabold tracking-tight uppercase">
            Your basket
          </SheetTitle>
          <SheetDescription>
            {itemCount === 0
              ? "Nothing in it yet."
              : `${itemCount} item${itemCount === 1 ? "" : "s"} ready to order.`}
          </SheetDescription>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="bg-secondary text-muted-foreground rounded-full p-4">
              <ShoppingBagIcon className="size-7" />
            </div>
            <div className="space-y-1">
              <p className="font-display font-bold uppercase">Your basket is empty</p>
              <p className="text-muted-foreground text-sm">
                Browse the shelves and add something you need.
              </p>
            </div>
            <Button asChild onClick={() => setOpen(false)}>
              <Link href="/products">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y overflow-y-auto px-4">
              {lines.map((line) => (
                <li key={line.productId} className="flex gap-3 py-4">
                  <Link
                    href={`/products/${line.product.slug}`}
                    onClick={() => setOpen(false)}
                    className="bg-secondary relative size-20 shrink-0 overflow-hidden rounded-lg"
                  >
                    <Image
                      src={line.product.image}
                      alt={line.product.name}
                      fill
                      sizes="80px"
                      className="object-cover"
                    />
                  </Link>

                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/products/${line.product.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-sm leading-snug font-medium hover:underline"
                      >
                        {line.product.name}
                      </Link>
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {formatPrice(line.product.price * line.quantity)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <QuantityStepper
                        quantity={line.quantity}
                        onChange={(quantity) =>
                          updateQuantity(line.productId, quantity)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive size-8"
                        onClick={() => removeItem(line.productId)}
                        aria-label={`Remove ${line.product.name}`}
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <SheetFooter className="border-t">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-semibold">
                  {formatPrice(totals.subtotal)}
                </span>
              </div>
              {totals.freeDeliveryRemaining > 0 && (
                <p className="text-muted-foreground text-xs">
                  Spend {formatPrice(totals.freeDeliveryRemaining)} more for
                  free delivery.
                </p>
              )}
              <Separator className="my-1" />
              <Button asChild size="lg" onClick={() => setOpen(false)}>
                <Link href="/checkout">Checkout</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                onClick={() => setOpen(false)}
              >
                <Link href="/cart">View basket</Link>
              </Button>
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
