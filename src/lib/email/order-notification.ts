import "server-only";

import { isReachableEmail, type PaidOrderInput } from "@/lib/crm/orders";
import { formatPriceExact } from "@/lib/money";
import { getSecret, getShopSettings } from "@/lib/shop/settings";
import {
  BRAND,
  DISPLAY_FONT,
  band,
  collectionCodePanel,
  detailRow,
  emailShell,
  escapeHtml,
  eyebrow,
} from "@/lib/email/template";

const RESEND_API = "https://api.resend.com/emails";

function itemRows(items: PaidOrderInput["items"], currency: string) {
  return items
    .filter((item) => item.name)
    .map((item) => {
      const quantity = Math.max(Math.round(Number(item.quantity) || 1), 1);
      const unitPrice = Math.round(Number(item.unit_price) || 0);
      return `<tr><td style="padding:8px 0;border-bottom:1px solid ${BRAND.rule}">${quantity} &times; ${escapeHtml(String(item.name))}</td><td style="padding:8px 0;border-bottom:1px solid ${BRAND.rule};text-align:right">${formatPriceExact(quantity * unitPrice, currency)}</td></tr>`;
    })
    .join("");
}

/**
 * Ghana keeps no daylight saving and the shop trades there, so a fixed zone is
 * honest. Without one this renders in whatever zone the server happens to sit
 * in — UTC on a Vercel function, something else on a local run.
 */
function formatPaidAt(paidAt: string | null | undefined) {
  const date = paidAt ? new Date(paidAt) : new Date();
  if (Number.isNaN(date.getTime())) return "Confirmed";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Africa/Accra",
  }).format(date);
}

/** The shop settings the templates read, so the builders need nothing else. */
export type EmailShopFields = { contactEmail: string; siteUrl: string };

export type NotificationResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; error: string };

/**
 * One place that talks to Resend, so the two mails below cannot drift on error
 * handling or on the idempotency key that keeps a webhook retry from sending
 * twice. That key must differ per mail — Resend dedupes on it, so sharing one
 * would mean the second mail silently never goes out.
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

/** The two-column details block: receipt facts on the left, customer on the right. */
function detailsBand(order: PaidOrderInput, isPickup: boolean) {
  const addressLine =
    !isPickup && order.address
      ? `<p style="margin:2px 0 0;color:${BRAND.mutedInk};font-size:13px">${escapeHtml(
          [order.address, order.city].filter(Boolean).join(", ")
        )}</p>`
      : "";

  const customer = [
    order.name
      ? `<p style="margin:0;font-weight:bold;font-size:13px">${escapeHtml(order.name)}</p>`
      : "",
    order.phone
      ? `<p style="margin:2px 0 0;font-size:13px">${escapeHtml(order.phone)}</p>`
      : "",
    addressLine,
  ].join("");

  return band(
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td width="50%" valign="top" style="padding-right:12px">
          ${eyebrow("Receipt details")}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${detailRow("Reference", escapeHtml(order.reference), true)}
            ${detailRow("Paid", formatPaidAt(order.paidAt))}
            ${detailRow("Method", isPickup ? "Pickup" : "Delivery")}
          </table>
        </td>
        <td width="50%" valign="top" style="padding-left:12px">
          ${eyebrow("Customer")}
          ${customer || `<p style="margin:0;color:${BRAND.mutedInk};font-size:13px">${escapeHtml(order.email)}</p>`}
        </td>
      </tr>
    </table>`
  );
}

/** Items list and the totals column, shared by both messages. */
function itemsAndTotals(order: PaidOrderInput, currency: string) {
  const items = itemRows(order.items, currency);

  const itemsBand = items
    ? band(
        `${eyebrow("Items")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px">${items}</table>`
      )
    : "";

  const totals = [
    order.subtotal !== undefined
      ? detailRow("Subtotal", formatPriceExact(order.subtotal, currency))
      : "",
    order.delivery !== undefined
      ? detailRow(
          "Delivery",
          order.delivery === 0 ? "Free" : formatPriceExact(order.delivery, currency)
        )
      : "",
  ].join("");

  const totalsBand = band(
    `<table role="presentation" align="right" cellpadding="0" cellspacing="0" style="width:330px;border-top:1px solid ${BRAND.rule}">
      <tr><td style="height:12px"></td></tr>
      ${totals}
      <tr>
        <td style="padding-top:8px;padding-right:16px;font-family:${DISPLAY_FONT};font-size:14px;font-weight:900;text-transform:uppercase;white-space:nowrap">Total paid</td>
        <td style="padding-top:8px;text-align:right;font-family:${DISPLAY_FONT};font-size:19px;font-weight:900;white-space:nowrap">${formatPriceExact(order.amount, currency)}</td>
      </tr>
    </table>`,
    "24px 28px 0"
  );

  return itemsBand + totalsBand;
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

  return send(
    apiKey,
    {
      from,
      // Whoever the shop set as its contact address in admin Settings.
      to: [settings.contactEmail],
      reply_to: order.email,
      subject: `Paid order ${order.reference} — ${formatPriceExact(order.amount, order.currency || "GHS")}`,
      html: buildPaidOrderEmail(order, settings),
    },
    `paid-order-${order.reference}`
  );
}

/** The staff alert's markup. Pure, so it can be rendered without sending. */
export function buildPaidOrderEmail(order: PaidOrderInput, settings: EmailShopFields) {
  const currency = order.currency || "GHS";
  const isPickup = order.fulfilmentMethod === "pickup";

  return emailShell({
    eyebrow: "New paid order",
    heading: "Order to fulfil",
    contactEmail: settings.contactEmail,
    siteUrl: settings.siteUrl,
    cta: { label: "Open in admin", href: `${settings.siteUrl}/admin/orders` },
    // Staff need to know the code was actually issued and sent on — an order
    // showing none is one where the customer has nothing to quote.
    footerNote: order.collectionCode
      ? "The customer has been emailed this code."
      : "This order has no handover code — verify the customer another way.",
    rows:
      collectionCodePanel(
        order.collectionCode,
        isPickup ? "pickup" : "delivery",
        "Ask the customer for this before handing the order over."
      ) +
      detailsBand(order, isPickup) +
      band(
        `${eyebrow("Contact")}
        <p style="margin:0;font-size:13px"><a href="mailto:${escapeHtml(order.email)}" style="color:${BRAND.primary};text-decoration:none">${escapeHtml(order.email)}</a></p>`
      ) +
      itemsAndTotals(order, currency),
  });
}

/**
 * The customer's own copy — the receipt page from /checkout/callback, rebuilt
 * as an email. Same header, code panel, details and totals, so what arrives is
 * recognisably the page they just saw.
 *
 * Sent from the webhook rather than that page: the code is otherwise shown
 * once in the browser and lost with the tab, and a customer who never returns
 * from Paystack would never see it at all.
 *
 * Paystack sends its own payment receipt, which we cannot add to. This follows
 * it rather than replacing it.
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

  return send(
    apiKey,
    {
      from,
      to: [order.email],
      reply_to: settings.contactEmail,
      subject: `Your Abys Hub order ${order.reference} is confirmed`,
      html: buildCustomerOrderEmail(order, settings),
    },
    // Distinct from the staff alert's key, or Resend treats the second send as
    // a duplicate of the first and drops it.
    `customer-order-${order.reference}`
  );
}

/** The customer's copy. Pure, so it can be rendered without sending. */
export function buildCustomerOrderEmail(
  order: PaidOrderInput,
  settings: EmailShopFields
) {
  const currency = order.currency || "GHS";
  const isPickup = order.fulfilmentMethod === "pickup";

  return emailShell({
    eyebrow: "Payment receipt",
    heading: "Order confirmed",
    contactEmail: settings.contactEmail,
    siteUrl: settings.siteUrl,
    cta: { label: "Keep shopping", href: `${settings.siteUrl}/products` },
    footerNote: "Any questions, just reply to this email.",
    rows:
      collectionCodePanel(
        order.collectionCode,
        isPickup ? "pickup" : "delivery",
        "Keep this code private. Staff will ask for it before handing over your order."
      ) +
      detailsBand(order, isPickup) +
      itemsAndTotals(order, currency),
  });
}
