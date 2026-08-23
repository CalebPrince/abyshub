import { NextResponse } from "next/server";

import { isValidWebhookSignature } from "@/lib/paystack";

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
      const reference = event.data?.reference;
      const amount = event.data?.amount;

      // TODO: persist the paid order, then email the customer and the shop.
      // Paystack retries until it gets a 200, so make this handler idempotent
      // (look the reference up first) once a database is wired in.
      console.info("[paystack] charge.success", { reference, amount });
      break;
    }

    default:
      console.info("[paystack] unhandled event", event.event);
  }

  return NextResponse.json({ received: true });
}
