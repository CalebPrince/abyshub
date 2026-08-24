"use server";

import { redirect } from "next/navigation";

import { SITE_URL } from "@/lib/config";
import {
  generateReference,
  initializeTransaction,
  paystackConfigured,
} from "@/lib/paystack";
import { calculateTotals, resolveLines } from "@/lib/totals";
import type { CartItem } from "@/lib/types";

export type CheckoutState = { error: string | null };

type ParsedCart = { ok: true; items: CartItem[] } | { ok: false };

/**
 * The browser sends product ids and quantities only — never prices. The order
 * is rebuilt and priced here from the catalogue, so a tampered payload cannot
 * change what gets charged.
 */
function parseCart(raw: FormDataEntryValue | null): ParsedCart {
  if (typeof raw !== "string") return { ok: false };

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false };

    const items = parsed.flatMap((entry): CartItem[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { productId, quantity } = entry as Partial<CartItem>;
      if (typeof productId !== "string") return [];
      if (typeof quantity !== "number" || !Number.isFinite(quantity)) return [];
      if (quantity < 1 || quantity > 99) return [];
      return [{ productId, quantity: Math.floor(quantity) }];
    });

    return { ok: true, items };
  } catch {
    return { ok: false };
  }
}

function requiredText(form: FormData, field: string): string {
  const value = form.get(field);
  return typeof value === "string" ? value.trim() : "";
}

export async function startPaystackCheckout(
  _previous: CheckoutState,
  formData: FormData
): Promise<CheckoutState> {
  if (!paystackConfigured()) {
    return {
      error:
        "Card payment is not switched on yet. Order on WhatsApp or send an enquiry instead.",
    };
  }

  const email = requiredText(formData, "email");
  const name = requiredText(formData, "name");
  const phone = requiredText(formData, "phone");
  const address = requiredText(formData, "address");
  const city = requiredText(formData, "city");

  if (!email.includes("@") || !name || !phone || !address || !city) {
    return { error: "Fill in every field so we know where to deliver." };
  }

  const cart = parseCart(formData.get("cart"));
  if (!cart.ok) return { error: "We could not read your basket. Try again." };

  const lines = resolveLines(cart.items);
  if (lines.length === 0) {
    return { error: "Your basket is empty." };
  }

  const outOfStock = lines.find((line) => !line.product.inStock);
  if (outOfStock) {
    return {
      error: `${outOfStock.product.name} is out of stock. Remove it to continue.`,
    };
  }

  const totals = calculateTotals(lines);
  const reference = generateReference();

  const result = await initializeTransaction({
    email,
    amount: totals.total,
    reference,
    callbackUrl: `${SITE_URL}/checkout/callback`,
    metadata: {
      customer_name: name,
      phone,
      address,
      city,
      // Kept small on purpose — Paystack metadata is not an order database.
      items: lines.map((line) => ({
        id: line.productId,
        name: line.product.name,
        quantity: line.quantity,
        unit_price: line.product.price,
      })),
      subtotal: totals.subtotal,
      delivery: totals.delivery,
    },
  });

  if (!result.ok) return { error: result.error };

  // Hand the customer to Paystack's hosted page.
  redirect(result.authorizationUrl);
}
