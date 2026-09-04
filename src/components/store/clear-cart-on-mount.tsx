"use client";

import * as React from "react";

import { clearCart } from "@/lib/cart-store";
import { track } from "@/lib/analytics/track";

/**
 * Empties the basket once a payment is confirmed. Runs as an effect on the
 * confirmation page rather than before redirecting to Paystack, so an
 * abandoned payment leaves the basket intact.
 *
 * The paid event is recorded from here for the same reason: this component
 * renders only on a verified success, so the funnel closes on Paystack's word
 * rather than on the shopper having reached a URL.
 */
export function ClearCartOnMount({ value }: { value?: number }) {
  React.useEffect(() => {
    clearCart();
    track({ name: "purchase", value });
    // Once per confirmation. A refresh of the receipt is not a second sale.
  }, [value]);

  return null;
}
