import "server-only";

import { CURRENCY } from "@/lib/config";
import { getSecret } from "@/lib/shop/settings";

const PAYSTACK_API = "https://api.paystack.co";

/**
 * The secret key never leaves the server. Database first, environment
 * variable second — the same rule every other setting in the shop follows —
 * so the key an admin types into the Payments page is the one actually
 * charged against, without needing a redeploy. Read lazily so the app still
 * builds and runs (in enquiry/WhatsApp-only mode) when neither is set.
 */
async function secretKey(): Promise<string | undefined> {
  const key = await getSecret("paystack_secret_key", process.env.PAYSTACK_SECRET_KEY);
  return key || undefined;
}

export async function paystackConfigured(): Promise<boolean> {
  return Boolean(await secretKey());
}

type InitializeArgs = {
  email: string;
  /** Charge amount in minor units. Always computed server-side. */
  amount: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
};

export type InitializeResult =
  | { ok: true; authorizationUrl: string; reference: string }
  | { ok: false; error: string };

export async function initializeTransaction({
  email,
  amount,
  reference,
  callbackUrl,
  metadata,
}: InitializeArgs): Promise<InitializeResult> {
  const key = await secretKey();
  if (!key) return { ok: false, error: "Paystack is not configured." };

  try {
    const response = await fetch(`${PAYSTACK_API}/transaction/initialize`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email,
        amount,
        currency: CURRENCY,
        reference,
        callback_url: callbackUrl,
        metadata,
      }),
      cache: "no-store",
    });

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: { authorization_url?: string; reference?: string };
    };

    if (!response.ok || !payload.status || !payload.data?.authorization_url) {
      return {
        ok: false,
        error: payload.message ?? "Paystack rejected the transaction.",
      };
    }

    return {
      ok: true,
      authorizationUrl: payload.data.authorization_url,
      reference: payload.data.reference ?? reference,
    };
  } catch {
    return { ok: false, error: "Could not reach Paystack. Try again." };
  }
}

export type VerifiedTransaction = {
  status: string;
  reference: string;
  /** Amount actually paid, in minor units. */
  amount: number;
  currency: string;
  paidAt: string | null;
  customerEmail: string | null;
  metadata: Record<string, unknown> | null;
};

export type VerifyResult =
  | { ok: true; transaction: VerifiedTransaction }
  | { ok: false; error: string };

export async function verifyTransaction(
  reference: string
): Promise<VerifyResult> {
  const key = await secretKey();
  if (!key) return { ok: false, error: "Paystack is not configured." };

  try {
    const response = await fetch(
      `${PAYSTACK_API}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${key}` },
        cache: "no-store",
      }
    );

    const payload = (await response.json()) as {
      status?: boolean;
      message?: string;
      data?: {
        status?: string;
        reference?: string;
        amount?: number;
        currency?: string;
        paid_at?: string | null;
        customer?: { email?: string };
        metadata?: Record<string, unknown>;
      };
    };

    if (!response.ok || !payload.status || !payload.data) {
      return {
        ok: false,
        error: payload.message ?? "Could not verify that payment.",
      };
    }

    return {
      ok: true,
      transaction: {
        status: payload.data.status ?? "unknown",
        reference: payload.data.reference ?? reference,
        amount: payload.data.amount ?? 0,
        currency: payload.data.currency ?? CURRENCY,
        paidAt: payload.data.paid_at ?? null,
        customerEmail: payload.data.customer?.email ?? null,
        metadata: payload.data.metadata ?? null,
      },
    };
  } catch {
    return { ok: false, error: "Could not reach Paystack. Try again." };
  }
}

/**
 * Paystack signs webhooks with HMAC SHA512 over the raw body, using the secret
 * key. Compare in constant time so the check cannot be timed.
 */
export async function isValidWebhookSignature(
  rawBody: string,
  signature: string | null
): Promise<boolean> {
  const key = await secretKey();
  if (!key || !signature) return false;

  const { createHmac, timingSafeEqual } = await import("node:crypto");
  const expected = createHmac("sha512", key).update(rawBody).digest("hex");

  const expectedBuffer = Buffer.from(expected, "utf8");
  const receivedBuffer = Buffer.from(signature, "utf8");

  if (expectedBuffer.length !== receivedBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

/** Order references are shown to customers, so keep them short and readable. */
export function generateReference(): string {
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AH-${Date.now().toString(36).toUpperCase()}-${random}`;
}
