import "server-only";

import type { PaidOrderInput } from "@/lib/crm/orders";
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

  try {
    const response = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": `paid-order-${order.reference}`,
      },
      body: JSON.stringify({
        from,
        to: [settings.contactEmail],
        reply_to: order.email,
        subject: `Paid order ${order.reference} — ${formatPriceExact(order.amount, currency)}`,
        html,
      }),
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
