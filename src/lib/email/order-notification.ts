import "server-only";

import { isReachableEmail, type PaidOrderInput } from "@/lib/crm/orders";
import { formatPriceExact } from "@/lib/money";
import { getSecret, getShopSettings } from "@/lib/shop/settings";

const RESEND_API = "https://api.resend.com/emails";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function itemRows(items: PaidOrderInput["items"], currency: string) {
  return items
    .filter((item) => item.name)
    .map((item) => {
      const quantity = Math.max(Math.round(Number(item.quantity) || 1), 1);
      const unitPrice = Math.round(Number(item.unit_price) || 0);
      return `<tr><td style="padding:8px 0;border-bottom:1px solid #e5e7eb">${quantity} × ${escapeHtml(String(item.name))}</td><td style="padding:8px 0;border-bottom:1px solid #e5e7eb;text-align:right">${formatPriceExact(quantity * unitPrice, currency)}</td></tr>`;
    })
    .join("");
}

export type NotificationResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/**
 * One place that talks to Resend, so the two mails below cannot drift on
 * error handling or on the idempotency key that keeps a webhook retry from
 * sending twice. That key must differ per mail — Resend dedupes on it, so
 * sharing one would mean the second mail silently never goes out.
 */
async function send(
  apiKey: string,
  body: Record<string, unknown>,
  idempotencyKey: string
): Promise<NotificationResult> {
  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { message?: string }
        | null;
      return {
        ok: false,
        error: payload?.message || `Resend returned ${response.status}.`,
      };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: "Could not reach Resend." };
  }
}

/** Sends the internal new-order alert after the verified order is persisted. */
export async function sendPaidOrderNotification(
  order: PaidOrderInput
): Promise<NotificationResult> {
  const [apiKey, settings] = await Promise.all([
    getSecret("resend_api_key", process.env.RESEND_API_KEY),
    getShopSettings(),
  ]);
  const from = settings.resendFromEmail;

  if (!apiKey || !from || !settings.contactEmail) {
    return { ok: true, skipped: true };
  }

  const currency = order.currency || "GHS";
  const fulfilment = order.fulfilmentMethod === "pickup" ? "Pickup" : "Delivery";
  const destination = [order.address, order.city].filter(Boolean).join(", ");
  const code = order.collectionCode ? escapeHtml(order.collectionCode) : "—";
  const html = `
    <div style="font-family:Arial,sans-serif;color:#171717;max-width:640px;margin:auto">
      <h1 style="font-size:24px;margin-bottom:4px">New paid order</h1>
      <p style="color:#666;margin-top:0">Reference ${escapeHtml(order.reference)}</p>
      <div style="background:#f5f5f5;border-radius:10px;padding:16px;margin:20px 0">
        <strong>${escapeHtml(order.name || "Customer")}</strong><br>
        ${escapeHtml(order.email)}${order.phone ? `<br>${escapeHtml(order.phone)}` : ""}<br>
        ${fulfilment}${destination ? ` — ${escapeHtml(destination)}` : ""}<br>
        Handover code: <strong>${code}</strong>
      </div>
      <table style="width:100%;border-collapse:collapse">${itemRows(order.items, currency)}</table>
      <p style="font-size:18px;text-align:right;margin-top:20px"><strong>Total paid: ${formatPriceExact(order.amount, currency)}</strong></p>
    </div>`;

  return send(
    apiKey,
    {
      from,
      // Whoever the shop set as its contact address in admin Settings.
      to: [settings.contactEmail],
      reply_to: order.email,
      subject: `Paid order ${order.reference} — ${formatPriceExact(order.amount, currency)}`,
      html,
    },
    `paid-order-${order.reference}`
  );
}

/**
 * The customer's own copy, carrying the handover code.
 *
 * Sent from the webhook rather than the receipt page: the code is otherwise
 * shown once in the browser and lost the moment the tab closes, and a
 * customer who never returns from Paystack would never see it at all.
 *
 * Paystack sends its own payment receipt, which we cannot add to — this is
 * a separate mail about collecting the order, not a second receipt.
 */
export async function sendCustomerOrderConfirmation(
  order: PaidOrderInput
): Promise<NotificationResult> {
  const [apiKey, settings] = await Promise.all([
    getSecret("resend_api_key", process.env.RESEND_API_KEY),
    getShopSettings(),
  ]);
  const from = settings.resendFromEmail;

  // Staff build orders for WhatsApp customers who often gave only a phone
  // number, and those get a synthesized address at a domain that does not
  // exist. Mailing it would earn nothing but bounces against our sending
  // reputation.
  if (!apiKey || !from || !isReachableEmail(order.email)) {
    return { ok: true, skipped: true };
  }

  const currency = order.currency || "GHS";
  const collecting = order.fulfilmentMethod === "pickup" ? "pickup" : "delivery";
  const greeting = order.name ? `Hi ${escapeHtml(order.name.split(" ")[0])},` : "Hi,";

  // Only shown when there is one. An order without a code must not be given
  // an invented one — staff would have nothing to check it against.
  const codeBlock = order.collectionCode
    ? `<div style="background:#f5f5f5;border-radius:10px;padding:20px;margin:24px 0;text-align:center">
        <p style="margin:0;color:#666;font-size:12px;letter-spacing:1.5px;text-transform:uppercase">Show this code on ${collecting}</p>
        <p style="margin:8px 0 0;font-size:32px;font-weight:bold;letter-spacing:4px">${escapeHtml(order.collectionCode)}</p>
        <p style="margin:12px 0 0;color:#666;font-size:12px">Keep this code private. Staff will ask for it before handing over your order.</p>
      </div>`
    : "";

  const html = `
    <div style="font-family:Arial,sans-serif;color:#171717;max-width:640px;margin:auto">
      <h1 style="font-size:24px;margin-bottom:4px">Your order is confirmed</h1>
      <p style="color:#666;margin-top:0">Reference ${escapeHtml(order.reference)}</p>
      <p>${greeting} thank you — your payment has gone through and we are preparing your order.</p>
      ${codeBlock}
      <table style="width:100%;border-collapse:collapse">${itemRows(order.items, currency)}</table>
      <p style="font-size:18px;text-align:right;margin-top:20px"><strong>Total paid: ${formatPriceExact(order.amount, currency)}</strong></p>
      <p style="color:#666;font-size:13px;margin-top:28px">Any questions, reply to this email or write to ${escapeHtml(settings.contactEmail)}.</p>
    </div>`;

  return send(
    apiKey,
    {
      from,
      to: [order.email],
      reply_to: settings.contactEmail,
      subject: `Your Abys Hub order ${order.reference} is confirmed`,
      html,
    },
    // Distinct from the staff alert's key, or Resend treats the second send
    // as a duplicate of the first and drops it.
    `customer-order-${order.reference}`
  );
}
