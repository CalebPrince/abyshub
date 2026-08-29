"use client";

import { useCart } from "@/components/store/cart-provider";
import { formatPrice, formatPriceExact } from "@/lib/money";

export function OrderSummary({ pickup = false }: { pickup?: boolean }) {
  const { totals, itemCount } = useCart();
  const delivery = pickup ? 0 : totals.delivery;
  const total = totals.subtotal + delivery;

  return (
    <dl className="space-y-2.5 text-sm">
      <div className="flex justify-between">
        <dt className="text-muted-foreground">
          Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})
        </dt>
        <dd className="font-medium tabular-nums">
          {formatPrice(totals.subtotal)}
        </dd>
      </div>

      <div className="flex justify-between">
        <dt className="text-muted-foreground">Delivery</dt>
        <dd className="font-medium tabular-nums">
          {pickup ? "Pickup" : delivery === 0 ? "Free" : formatPrice(delivery)}
        </dd>
      </div>

      {!pickup && totals.freeDeliveryRemaining > 0 && (
        <p className="text-muted-foreground text-xs">
          Spend {formatPrice(totals.freeDeliveryRemaining)} more for free
          delivery.
        </p>
      )}

      <div className="border-foreground/15 mt-3 flex items-baseline justify-between border-t pt-3">
        <dt className="font-display text-base font-bold tracking-tight uppercase">
          Total
        </dt>
        <dd className="font-display text-xl font-extrabold tabular-nums">
          {formatPriceExact(total)}
        </dd>
      </div>
    </dl>
  );
}
