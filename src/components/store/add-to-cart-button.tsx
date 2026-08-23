"use client";

import * as React from "react";
import { CheckIcon, ShoppingBagIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCart } from "@/components/store/cart-provider";
import type { Product } from "@/lib/types";

type AddToCartButtonProps = {
  product: Product;
  quantity?: number;
  label?: string;
  showIcon?: boolean;
  openCartOnAdd?: boolean;
  size?: React.ComponentProps<typeof Button>["size"];
  variant?: React.ComponentProps<typeof Button>["variant"];
  className?: string;
};

export function AddToCartButton({
  product,
  quantity = 1,
  label = "Add to cart",
  showIcon = false,
  openCartOnAdd = false,
  size = "default",
  variant = "default",
  className,
}: AddToCartButtonProps) {
  const { addItem, setOpen } = useCart();
  const [justAdded, setJustAdded] = React.useState(false);
  const timeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  React.useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    []
  );

  function handleClick() {
    addItem(product.id, quantity);
    setJustAdded(true);
    if (openCartOnAdd) setOpen(true);

    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => setJustAdded(false), 1600);
  }

  if (!product.inStock) {
    return (
      <Button size={size} variant="secondary" className={className} disabled>
        Sold out
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      className={className}
      onClick={handleClick}
    >
      {justAdded ? (
        <>
          <CheckIcon /> Added
        </>
      ) : (
        <>
          {showIcon && <ShoppingBagIcon />}
          {label}
        </>
      )}
    </Button>
  );
}
