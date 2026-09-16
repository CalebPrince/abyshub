"use client";

import * as React from "react";

import type { GalleryVariant } from "@/components/store/product-gallery";

type ProductVariantContextValue = {
  variants: GalleryVariant[];
  selected: string | null;
  select: (name: string | null) => void;
};

const ProductVariantContext =
  React.createContext<ProductVariantContextValue | null>(null);

/**
 * Shared between the gallery (which sets the selection) and the buy box
 * (which reads it to require one before "Add to cart" works) even though
 * they are two separate client components in different columns of the page.
 * A product with no variants still gets a provider — an always-empty one —
 * so neither side has to branch on whether it exists.
 */
export function ProductVariantProvider({
  variants,
  children,
}: {
  variants?: GalleryVariant[];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = React.useState<string | null>(null);

  const value = React.useMemo(
    () => ({ variants: variants ?? [], selected, select: setSelected }),
    [variants, selected]
  );

  return (
    <ProductVariantContext.Provider value={value}>
      {children}
    </ProductVariantContext.Provider>
  );
}

export function useProductVariant() {
  const context = React.useContext(ProductVariantContext);
  if (!context) {
    throw new Error("useProductVariant must be used within a ProductVariantProvider");
  }
  return context;
}
