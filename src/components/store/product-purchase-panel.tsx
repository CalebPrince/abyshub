"use client";

import * as React from "react";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { QuantityStepper } from "@/components/store/quantity-stepper";
import type { Product } from "@/lib/types";

export function ProductPurchasePanel({ product }: { product: Product }) {
  const [quantity, setQuantity] = React.useState(1);

  return (
    <div className="flex flex-wrap items-center gap-3">
      {product.inStock && (
        <QuantityStepper quantity={quantity} onChange={setQuantity} />
      )}
      <AddToCartButton
        product={product}
        quantity={quantity}
        size="lg"
        showIcon
        openCartOnAdd
        className="flex-1 sm:flex-none"
      />
    </div>
  );
}
