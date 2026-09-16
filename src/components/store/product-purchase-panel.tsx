"use client";

import * as React from "react";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import { useProductVariant } from "@/components/store/product-variant-context";
import type { Product } from "@/lib/types";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = React.useState(1);
  const { variants, selected } = useProductVariant();
  // A product with no variants has nothing to require; one that has them
  // is not addable until the picker up in the info column has been used —
  // the button being live is itself the signal that a choice still counts.
  const needsVariant = variants.length > 0 && !selected;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {product.inStock && (
          <QuantityStepper
            quantity={quantity}
            onChange={setQuantity}
            max={product.stockQuantity ?? 99}
          />
        )}
        <AddToCartButton
          product={product}
          quantity={quantity}
          size="lg"
          showIcon
          openCartOnAdd
          disabled={needsVariant}
          className="flex-1 sm:flex-none"
        />
      </div>
      {needsVariant ? (
        <p className="text-primary text-sm font-medium">
          Select a fragrance above before adding to cart.
        </p>
      ) : null}
    </div>
  );
}
