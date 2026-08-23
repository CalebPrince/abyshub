"use client";

import * as React from "react";

import * as cartStore from "@/lib/cart-store";
import {
  calculateTotals,
  resolveLines,
  type OrderLine,
  type OrderTotals,
} from "@/lib/totals";
import type { CartItem } from "@/lib/types";

type CartContextValue = {
  items: CartItem[];
  lines: OrderLine[];
  itemCount: number;
  totals: OrderTotals;
  hydrated: boolean;
  isOpen: boolean;
  setOpen: (open: boolean) => void;
  addItem: (productId: string, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = React.createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { items, hydrated } = React.useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getSnapshot,
    cartStore.getServerSnapshot
  );

  const [isOpen, setOpen] = React.useState(false);

  const lines = React.useMemo(() => resolveLines(items), [items]);
  const totals = React.useMemo(() => calculateTotals(lines), [lines]);

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
      hydrated,
      isOpen,
      setOpen,
      addItem: cartStore.addItem,
      removeItem: cartStore.removeItem,
      updateQuantity: cartStore.updateQuantity,
      clearCart: cartStore.clearCart,
    }),
    [items, lines, itemCount, totals, hydrated, isOpen]
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
