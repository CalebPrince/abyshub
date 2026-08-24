import { DELIVERY_FLAT_RATE, FREE_DELIVERY_THRESHOLD } from "@/lib/config";
import type { CartItem, Product } from "@/lib/types";

/**
 * Delivery rates are passed in rather than imported, so the same maths runs
 * against database settings on the server and against the values handed to the
 * browser — one calculation, one answer, wherever it is asked.
 */
export type DeliveryRates = {
  freeDeliveryThreshold: number;
  deliveryFlatRate: number;
};

export const ENV_RATES: DeliveryRates = {
  freeDeliveryThreshold: FREE_DELIVERY_THRESHOLD,
  deliveryFlatRate: DELIVERY_FLAT_RATE,
};

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
export function resolveLines(
  items: CartItem[],
  catalogue: Product[]
): OrderLine[] {
  const byId = new Map(catalogue.map((product) => [product.id, product]));

  return items.flatMap((item) => {
    const product = byId.get(item.productId);
    // Silently drops anything no longer in the catalogue, which is what keeps
    // a stale basket from blocking checkout.
    if (!product) return [];

    const quantity = Math.floor(item.quantity);
    if (!Number.isFinite(quantity) || quantity < 1) return [];

    return [{ productId: item.productId, quantity, product }];
  });
}

export function calculateTotals(
  lines: OrderLine[],
  rates: DeliveryRates = ENV_RATES
): OrderTotals {
  const subtotal = lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0
  );

  const delivery =
    subtotal === 0 || subtotal >= rates.freeDeliveryThreshold
      ? 0
      : rates.deliveryFlatRate;

  return {
    subtotal,
    delivery,
    total: subtotal + delivery,
    freeDeliveryRemaining: Math.max(0, rates.freeDeliveryThreshold - subtotal),
  };
}
