"use server";

import { requireAdmin } from "@/lib/admin/dal";
import { createPendingOrder } from "@/lib/crm/orders";
import { getCatalogue } from "@/lib/shop/catalogue";
import { getShopSettings } from "@/lib/shop/settings";
import {
  generateReference,
  initializeTransaction,
  paystackConfigured,
} from "@/lib/paystack";

export type WhatsAppOrderState = {
  error: string | null;
  notice: string | null;
  authorizationUrl: string | null;
};

type ParsedLine = { productId: string; quantity: number; unitPrice: number };

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Staff enter prices in major units (e.g. "12.50"); stored as minor units. */
function toMinorUnits(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
}

function parseLines(raw: FormDataEntryValue | null): ParsedLine[] {
  if (typeof raw !== "string") return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.flatMap((entry): ParsedLine[] => {
      if (typeof entry !== "object" || entry === null) return [];
      const { productId, quantity, unitPrice } = entry as Record<string, unknown>;
      if (typeof productId !== "string" || !productId) return [];
      if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity < 1) {
        return [];
      }
      if (typeof unitPrice !== "number" || !Number.isFinite(unitPrice) || unitPrice < 0) {
        return [];
      }
      return [{ productId, quantity: Math.floor(quantity), unitPrice: Math.round(unitPrice) }];
    });
  } catch {
    return [];
  }
}

/**
 * Builds an order from a WhatsApp conversation: staff picks products,
 * quantities and (since bulk orders are usually negotiated) a price per
 * line, then this writes a pending order and — if Paystack is configured —
 * returns a payment link to copy back into the chat. The order is recorded
 * either way; the link is best-effort.
 */
export async function createWhatsAppOrder(
  _previous: WhatsAppOrderState,
  formData: FormData
): Promise<WhatsAppOrderState> {
  await requireAdmin();

  const name = text(formData, "name");
  const phone = text(formData, "phone");
  let email = text(formData, "email");
  const address = text(formData, "address");
  const city = text(formData, "city");
  const delivery = toMinorUnits(text(formData, "delivery") || "0");

  if (!name || !phone) {
    return {
      error: "Enter at least a name and phone number.",
      notice: null,
      authorizationUrl: null,
    };
  }

  const lines = parseLines(formData.get("lines"));
  if (lines.length === 0) {
    return {
      error: "Add at least one product.",
      notice: null,
      authorizationUrl: null,
    };
  }

  // WhatsApp customers often only give a phone number. Paystack and the
  // orders table both require an email, so one is synthesized rather than
  // blocking the order on a detail the customer never gave.
  if (!email) {
    const digits = phone.replace(/\D/g, "");
    email = `wa${digits}@abyshub.orders`;
  } else if (!email.includes("@")) {
    return {
      error: "That email doesn't look right — leave it blank instead.",
      notice: null,
      authorizationUrl: null,
    };
  }

  const { products } = await getCatalogue();
  const byId = new Map(products.map((product) => [product.id, product]));

  const items = lines.flatMap((line) => {
    const product = byId.get(line.productId);
    if (!product) return [];
    return [
      {
        id: line.productId,
        name: product.name,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
      },
    ];
  });

  if (items.length === 0) {
    return {
      error: "None of those products were found. Try again.",
      notice: null,
      authorizationUrl: null,
    };
  }

  const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = subtotal + delivery;

  const settings = await getShopSettings();
  const reference = generateReference();

  const result = await createPendingOrder({
    reference,
    email,
    name,
    phone,
    address: address || undefined,
    city: city || undefined,
    subtotal,
    delivery,
    total,
    items,
  });

  if (!result.ok) {
    return { error: result.error, notice: null, authorizationUrl: null };
  }

  if (!(await paystackConfigured())) {
    return {
      error: null,
      notice:
        "Order recorded. Paystack isn't configured, so arrange payment manually (bank transfer or mobile money).",
      authorizationUrl: null,
    };
  }

  const payment = await initializeTransaction({
    email,
    amount: total,
    reference,
    callbackUrl: `${settings.siteUrl}/checkout/callback`,
    metadata: {
      customer_name: name,
      phone,
      channel: "whatsapp",
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
      })),
      subtotal,
      delivery,
    },
  });

  if (!payment.ok) {
    return {
      error: null,
      notice: `Order recorded, but the payment link failed: ${payment.error}`,
      authorizationUrl: null,
    };
  }

  return { error: null, notice: null, authorizationUrl: payment.authorizationUrl };
}
