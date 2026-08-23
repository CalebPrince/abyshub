import { STORE_NAME } from "@/lib/config";
import { formatPrice, formatPriceExact } from "@/lib/money";
import type { OrderLine, OrderTotals } from "@/lib/totals";

/**
 * Renders a basket as a plain-text WhatsApp message. Kept out of the component
 * so the same text can be reused (email, enquiry form) without duplication.
 */
export function buildWhatsAppOrder(
  lines: OrderLine[],
  totals: OrderTotals
): string {
  const items = lines
    .map(
      (line, index) =>
        `${index + 1}. ${line.product.name} (${line.product.brand}) x${line.quantity} — ${formatPrice(
          line.product.price * line.quantity
        )}`
    )
    .join("\n");

  return [
    `Hello ${STORE_NAME}, I would like to order:`,
    "",
    items,
    "",
    `Subtotal: ${formatPrice(totals.subtotal)}`,
    `Delivery: ${totals.delivery === 0 ? "Free" : formatPrice(totals.delivery)}`,
    `Total: ${formatPriceExact(totals.total)}`,
    "",
    "Please confirm availability and delivery.",
  ].join("\n");
}
