import { DELIVERY_FLAT_RATE, FREE_DELIVERY_THRESHOLD } from "@/lib/config";
import { getProductById } from "@/lib/products";
import type { CartItem, Product } from "@/lib/types";

export type OrderLine = CartItem & { product: Product };

export type OrderTotals = {
  subtotal: number;
  delivery: number;
  total: number;
  freeDeliveryRemaining: number;
};

/**
 * Resolves cart items against the catalogue, dropping anything unknown. The
 * server runs this too, so the charged amount never comes from the browser.
 */
export function resolveLines(items: CartItem[]): OrderLine[] {
  return items.flatMap((item) => {
    const product = getProductById(item.productId);
    if (!product) return [];

    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) return [];

    return [{ productId: item.productId, quantity, product }];
  });
}

export function calculateTotals(lines: OrderLine[]): OrderTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0
  );

  const delivery =
    subtotal === 0 || subtotal >= FREE_DELIVERY_THRESHOLD
      ? 0
      : DELIVERY_FLAT_RATE;

  return {
    subtotal,
    delivery,
    total: subtotal + delivery,
    freeDeliveryRemaining: Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal),
  };
}
