import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";

import { isValidWebhookSignature } from "@/lib/paystack";
import { paidOrderFromPaystack, recordPaidOrder } from "@/lib/crm/orders";
import { CATALOGUE_TAG } from "@/lib/shop/catalogue";
import {
  sendCustomerOrderConfirmation,
  sendPaidOrderNotification,
} from "@/lib/email/order-notification";

/**
 * Paystack posts here when a charge settles. This is the authoritative signal
 * that money moved — the browser redirect is not, since a customer can close
 * the tab before it happens.
 *
 * The signature is verified against the raw body before anything is trusted.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-paystack-signature");

  if (!(await isValidWebhookSignature(rawBody, signature))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: { event?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Malformed payload" }, { status: 400 });
  }

  switch (event.event) {
    case "charge.success": {
      const data = (event.data ?? {}) as Record<string, never>;
      const reference = String(data.reference ?? "");
      const metadata = (data.metadata ?? {}) as Record<string, never>;
      const customer = (data.customer ?? {}) as Record<string, never>;

      if (!reference) {
        // Nothing to key on, so nothing can be made idempotent. Take the 200
        // anyway: retrying will not conjure a reference.
        console.error("[paystack] charge.success with no reference");
        break;
      }

      const paidOrder = paidOrderFromPaystack(
        {
          reference,
          email: String(customer.email ?? metadata.email ?? ""),
          amount: Number(data.amount ?? 0),
          currency: data.currency ? String(data.currency) : null,
          paidAt: data.paid_at ? String(data.paid_at) : null,
          metadata,
        },
        event
      );
      const result = await recordPaidOrder(paidOrder);

      if (!result.ok) {
        // 500 so Paystack retries — the charge is real and we have no record
        // of it. recordPaidOrder is idempotent, so a retry is safe.
        console.error("[paystack] could not record order", reference, result.error);
        return NextResponse.json({ error: "Could not record order" }, { status: 500 });
      }

      // The paid-order write also decrements physical stock. Expire the shared
      // catalogue immediately so product pages, carts and Mimi quote the new
      // remaining quantity on their next request.
      revalidateTag(CATALOGUE_TAG, { expire: 0 });

      // Both mails are sent, and neither is allowed to sink the other: the
      // customer's copy carries their handover code, the staff alert is how
      // the order gets picked up. Settled in parallel because Paystack is
      // waiting on this response.
      const [notification, confirmation] = await Promise.all([
        sendPaidOrderNotification(paidOrder),
        sendCustomerOrderConfirmation(paidOrder),
      ]);

      // The payment and order are already safely recorded by this point.
      // Email is a notification, so a mail-provider outage must never turn
      // into a rejected webhook and a payment we look like we did not take.
      if (!notification.ok) {
        console.error(
          "[resend] could not send paid-order notification",
          reference,
          notification.error
        );
      }

      if (!confirmation.ok) {
        console.error(
          "[resend] could not send customer confirmation",
          reference,
          confirmation.error
        );
      }

      break;
    }

    default:
      console.info("[paystack] unhandled event", event.event);
  }

  return NextResponse.json({ received: true });
}
