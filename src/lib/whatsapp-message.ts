import { SITE_URL, STORE_NAME } from "@/lib/config";
import { formatPrice, formatPriceExact } from "@/lib/money";
import type { OrderLine, OrderTotals } from "@/lib/totals";
import type { Product } from "@/lib/types";

function absoluteStoreUrl(path: string): string {
  return new URL(path, `${SITE_URL}/`).toString();
}

function productDetails(product: Product): string[] {
  return [
    `Product link: ${absoluteStoreUrl(`/products/${product.slug}`)}`,
    `Product image: ${absoluteStoreUrl(product.image)}`,
  ];
}

export function buildWhatsAppProductEnquiry(product: Product): string {
  return [
    `Hello ${STORE_NAME}, is the ${product.name} (${product.brand}) available?`,
    "",
    ...productDetails(product),
  ].join("\n");
}

/** Renders a basket as a plain-text WhatsApp message. */
export function buildWhatsAppOrder(
  lines: OrderLine[],
  totals: OrderTotals
): string {
  const items = lines
    .map((line, index) =>
      [
        `${index + 1}. ${line.product.name} (${line.product.brand}) x${line.quantity} — ${formatPrice(
          line.product.price * line.quantity
        )}`,
        ...productDetails(line.product),
      ].join("\n")
    )
    .join("\n\n");

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
