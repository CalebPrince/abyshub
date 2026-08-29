import "server-only";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";

type PaystackItem = {
  id?: string;
  name?: string;
  quantity?: number;
  unit_price?: number;
};

export type PaidOrderInput = {
  reference: string;
  email: string;
  amount: number;
  currency?: string;
  paidAt?: string | null;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  fulfilmentMethod?: "delivery" | "pickup";
  collectionCode?: string;
  subtotal?: number;
  delivery?: number;
  items: PaystackItem[];
  rawPayload: unknown;
};

function toInt(value: unknown, fallback = 0) {
  const n = typeof value === "string" ? Number(value) : value;
  return typeof n === "number" && Number.isFinite(n) ? Math.round(n) : fallback;
}

/**
 * Writes a settled order, and the customer behind it, from a verified Paystack
 * event.
 *
 * Idempotent by design. Paystack retries a webhook until it gets a 200, so the
 * same `charge.success` will arrive more than once; every write here is keyed
 * on the unique `reference`, and the line items are cleared before reinsert so
 * a retry cannot double them up.
 *
 * Runs through the service role because a webhook has no signed-in user to
 * authorise against.
 */
export async function recordPaidOrder(input: PaidOrderInput) {
  if (!adminClientAvailable()) {
    return { ok: false as const, error: "Supabase service role is not configured." };
  }

  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();

  // --- the customer ---------------------------------------------------------
  // Upsert on email so a repeat buyer accumulates history rather than
  // sprouting a second record.
  let customerId: string | null = null;

  if (email) {
    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        {
          email,
          name: input.name || null,
          phone: input.phone || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .maybeSingle();

    customerId = customer?.id ?? null;
  }

  // --- the order ------------------------------------------------------------
  const subtotal = toInt(input.subtotal);
  const delivery = toInt(input.delivery);
  const total = toInt(input.amount);

  const { data: order, error } = await supabase
    .from("orders")
    .upsert(
      {
        reference: input.reference,
        customer_id: customerId,
        email,
        name: input.name || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        fulfilment_method: input.fulfilmentMethod ?? "delivery",
        collection_code: input.collectionCode || null,
        subtotal: subtotal || Math.max(total - delivery, 0),
        delivery,
        total,
        currency: input.currency || "GHS",
        payment_status: "paid",
        // No `channel` here on purpose: the column defaults to 'card' on a
        // fresh insert, which is right for a real card checkout, but writing
        // it here would also run on the conflict-update — silently flipping
        // a WhatsApp-originated pending order back to "card" the moment it's
        // paid. Leaving it out means an existing row's channel survives.
        paid_at: input.paidAt ?? new Date().toISOString(),
        raw_payload: input.rawPayload as never,
      },
      { onConflict: "reference" }
    )
    .select("id")
    .maybeSingle();

  if (error || !order) {
    return { ok: false as const, error: error?.message ?? "Order was not written." };
  }

  // --- the lines ------------------------------------------------------------
  // Delete-then-insert rather than upsert: line items have no natural key, so
  // this is what keeps a webhook retry from duplicating them.
  await supabase.from("order_items").delete().eq("order_id", order.id);

  const lines = input.items
    .filter((item) => item?.name)
    .map((item) => ({
      order_id: order.id,
      product_id: item.id ?? null,
      name: String(item.name),
      unit_price: toInt(item.unit_price),
      quantity: Math.max(toInt(item.quantity, 1), 1),
    }));

  if (lines.length > 0) {
    await supabase.from("order_items").insert(lines);
  }

  // --- customer rollup ------------------------------------------------------
  // Recomputed from the orders table rather than incremented, so a retry or a
  // manual correction can never drift the totals.
  if (customerId) {
    const { data: paid } = await supabase
      .from("orders")
      .select("total")
      .eq("customer_id", customerId)
      .eq("payment_status", "paid");

    if (paid) {
      await supabase
        .from("customers")
        .update({
          order_count: paid.length,
          total_spent: paid.reduce((sum, row) => sum + toInt(row.total), 0),
        })
        .eq("id", customerId);
    }
  }

  return { ok: true as const, orderId: order.id };
}

export type PendingOrderInput = {
  reference: string;
  email: string;
  name?: string;
  phone?: string;
  address?: string;
  city?: string;
  subtotal: number;
  delivery: number;
  total: number;
  currency?: string;
  items: { id: string; name: string; quantity: number; unitPrice: number }[];
};

/**
 * Writes an order staff built by hand from a WhatsApp conversation, before
 * any money has moved — `payment_status` starts at 'pending' and `channel`
 * at 'whatsapp'. The Paystack webhook later upserts onto the same
 * `reference` once the customer pays, via recordPaidOrder above; that write
 * deliberately leaves `channel` alone so this order stays tagged 'whatsapp'
 * rather than being reclassified as 'card'.
 */
export async function createPendingOrder(input: PendingOrderInput) {
  if (!adminClientAvailable()) {
    return { ok: false as const, error: "Supabase service role is not configured." };
  }

  const supabase = createAdminClient();
  const email = input.email.trim().toLowerCase();

  let customerId: string | null = null;

  if (email) {
    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        {
          email,
          name: input.name || null,
          phone: input.phone || null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      )
      .select("id")
      .maybeSingle();

    customerId = customer?.id ?? null;
  }

  const { data: order, error } = await supabase
    .from("orders")
    .upsert(
      {
        reference: input.reference,
        customer_id: customerId,
        email,
        name: input.name || null,
        phone: input.phone || null,
        address: input.address || null,
        city: input.city || null,
        subtotal: toInt(input.subtotal),
        delivery: toInt(input.delivery),
        total: toInt(input.total),
        currency: input.currency || "GHS",
        payment_status: "pending",
        channel: "whatsapp",
      },
      { onConflict: "reference" }
    )
    .select("id")
    .maybeSingle();

  if (error || !order) {
    return { ok: false as const, error: error?.message ?? "Order was not written." };
  }

  const lines = input.items.map((item) => ({
    order_id: order.id,
    product_id: item.id,
    name: item.name,
    unit_price: toInt(item.unitPrice),
    quantity: Math.max(toInt(item.quantity, 1), 1),
  }));

  if (lines.length > 0) {
    await supabase.from("order_items").insert(lines);
  }

  return { ok: true as const, orderId: order.id };
}
