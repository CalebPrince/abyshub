"use client";

import * as React from "react";

import { clearCart } from "@/lib/cart-store";

/**
 * Empties the basket once a payment is confirmed. Runs as an effect on the
 * confirmation page rather than before redirecting to Paystack, so an
 * abandoned payment leaves the basket intact.
 */
export function ClearCartOnMount() {
  React.useEffect(() => {
    clearCart();
  }, []);

  return null;
}
