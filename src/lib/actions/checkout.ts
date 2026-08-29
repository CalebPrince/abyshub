"use server";

import { redirect } from "next/navigation";

import {
  generateReference,
  generateCollectionCode,
  initializeTransaction,
  paystackConfigured,
} from "@/lib/paystack";
import { calculateTotals, resolveLines } from "@/lib/totals";
import { getCustomer } from "@/lib/account/dal";
import { getCatalogue } from "@/lib/shop/catalogue";
import { getShopSettings } from "@/lib/shop/settings";
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
  if (!(await paystackConfigured())) {
    return {
      error:
        "Card payment is not switched on yet. Order on WhatsApp or send an enquiry instead.",
    };
  }

  // The page already turned anonymous visitors away, but a Server Action is a
  // public endpoint — anything reachable by a form post has to check for
  // itself rather than trust that a page did.
  const customer = await getCustomer();
  if (!customer) {
    return { error: "Please sign in to complete your order." };
  }

  const email = requiredText(formData, "email");
  const name = requiredText(formData, "name");
  const phone = requiredText(formData, "phone");
  const address = requiredText(formData, "address");
  const city = requiredText(formData, "city");
  const fulfilmentMethod = requiredText(formData, "fulfilment_method");

  if (fulfilmentMethod !== "delivery" && fulfilmentMethod !== "pickup") {
    return { error: "Choose pickup or delivery to continue." };
  }

  if (
    !email.includes("@") ||
    !name ||
    !phone ||
    (fulfilmentMethod === "delivery" && (!address || !city))
  ) {
    return {
      error:
        fulfilmentMethod === "delivery"
          ? "Fill in every delivery field so we know where to bring your order."
          : "Enter your name, phone number and email to continue.",
    };
  }

  const cart = parseCart(formData.get("cart"));
  if (!cart.ok) return { error: "We could not read your basket. Try again." };

  // Priced from the database, not from a source file: this is the number the
  // customer is actually charged, so it has to come from the same place the
  // shop quoted from.
  const [{ products }, settings] = await Promise.all([
    getCatalogue(),
    getShopSettings(),
  ]);

  const lines = resolveLines(cart.items, products);
  if (lines.length === 0) {
    return { error: "Your basket is empty." };
  }

  const outOfStock = lines.find((line) => !line.product.inStock);
  if (outOfStock) {
    return {
      error: `${outOfStock.product.name} is out of stock. Remove it to continue.`,
    };
  }

  const calculatedTotals = calculateTotals(lines, {
    freeDeliveryThreshold: settings.freeDeliveryThreshold,
    deliveryFlatRate: settings.deliveryFlatRate,
  });
  const totals =
    fulfilmentMethod === "pickup"
      ? { ...calculatedTotals, delivery: 0, total: calculatedTotals.subtotal }
      : calculatedTotals;
  const reference = generateReference();
  const collectionCode = await generateCollectionCode();

  const result = await initializeTransaction({
    email,
    amount: totals.total,
    reference,
    callbackUrl: `${settings.siteUrl}/checkout/callback`,
    metadata: {
      customer_name: name,
      phone,
      address,
      city,
      fulfilment_method: fulfilmentMethod,
      collection_code: collectionCode,
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
