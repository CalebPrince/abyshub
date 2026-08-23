"use client";

import { useCart } from "@/components/store/cart-provider";
import { formatPrice, formatPriceExact } from "@/lib/money";

export function OrderSummary() {
  const { totals, itemCount } = useCart();

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
          {totals.delivery === 0 ? "Free" : formatPrice(totals.delivery)}
        </dd>
      </div>

      {totals.freeDeliveryRemaining > 0 && (
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
          {formatPriceExact(totals.total)}
        </dd>
      </div>
    </dl>
  );
}
