"use client";

import * as React from "react";

import * as cartStore from "@/lib/cart-store";
import {
  calculateTotals,
  resolveLines,
  type OrderLine,
  type OrderTotals,
} from "@/lib/totals";
import type { DeliveryRates } from "@/lib/totals";
import type { CartItem, Product } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  /**
   * The same rates the totals were priced with. Exposed so copy that merely
   * *states* the free-delivery threshold quotes the figure the basket is
   * actually using, instead of importing the build-time constant and
   * promising something checkout will not honour.
   */
  rates: DeliveryRates;
  lines: OrderLine[];
  itemCount: number;
  totals: OrderTotals;
  hydrated: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number, max?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

/**
 * The catalogue and the delivery rates arrive as props from the server, rather
 * than being imported here.
 *
 * The basket prices itself in the browser, so if this component read a
 * hardcoded catalogue it would keep showing yesterday's prices after an edit —
 * and disagree with the amount the server actually charges. Handing it the
 * same data the server priced from is what keeps those two in step.
 */
export function CartProvider({
  children,
  catalogue,
  rates,
}: {
  children: React.ReactNode;
  catalogue: Product[];
  rates: DeliveryRates;
}) {
  const { items, hydrated } = React.useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

  const [isOpen, setOpen] = React.useState(false);

  const lines = React.useMemo(
    () => resolveLines(items, catalogue),
    [items, catalogue]
  );
  const totals = React.useMemo(
    () => calculateTotals(lines, rates),
    [lines, rates]
  );

  const itemCount = React.useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  const value = React.useMemo<CartContextValue>(
    () => ({
      items,
      lines,
      itemCount,
      totals,
      rates,
      hydrated,
      isOpen,
      setOpen,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      updateQuantity: cartStore.updateQuantity,
      clearCart: cartStore.clearCart,
    }),
    [items, lines, itemCount, totals, rates, hydrated, isOpen]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = React.useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used inside a CartProvider");
  }
  return context;
}
