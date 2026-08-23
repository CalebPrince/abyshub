"use client";

import { ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-provider";

export function CartButton() {
  const { itemCount, setOpen, hydrated } = useCart();

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative"
      onClick={() => setOpen(true)}
      aria-label={`Open bag${
        hydrated && itemCount > 0
          ? `, ${itemCount} ${itemCount === 1 ? "item" : "items"}`
          : ""
      }`}
    >
      <ShoppingBagIcon className="size-5" />
      {hydrated && itemCount > 0 && (
        <span className="bg-accent text-accent-foreground absolute -top-0.5 -right-0.5 flex size-4.5 items-center justify-center rounded-full text-[10px] font-semibold tabular-nums">
          {itemCount > 9 ? "9+" : itemCount}
        </span>
      )}
    </Button>
  );
}
