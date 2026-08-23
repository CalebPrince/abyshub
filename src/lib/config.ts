/**
 * Storefront configuration. Everything here is safe to expose to the browser —
 * the Paystack *secret* key is read only in server code (see lib/paystack.ts).
 */

/**
 * ISO 4217 code Paystack charges in. Paystack supports NGN, GHS, ZAR, KES and
 * USD; the account must be enabled for whichever you set here.
 */
export const CURRENCY = process.env.NEXT_PUBLIC_CURRENCY ?? "GHS";

/** Locale used to format prices. */
export const LOCALE = process.env.NEXT_PUBLIC_LOCALE ?? "en-GH";

/** Where customers reach the shop for WhatsApp orders. Digits only, with country code. */
export const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "";

export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "orders@abyshub.com";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const STORE_NAME = "Abys Hub";

/** The name the chat assistant introduces herself by. */
export const ASSISTANT_NAME = "Lisa";

/** Order totals, all in minor units of CURRENCY (pesewas). */
export const FREE_DELIVERY_THRESHOLD = Number(
  process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD ?? 50000
);

export const DELIVERY_FLAT_RATE = Number(
  process.env.NEXT_PUBLIC_DELIVERY_FLAT_RATE ?? 3500
);

/** True when a WhatsApp number is configured, so the UI can hide the option. */
export const whatsappEnabled = WHATSAPP_NUMBER.length > 0;

/**
 * Details the legal pages need. Anything left blank is omitted from the page
 * rather than printed as an empty placeholder — but fill them in before you
 * trade: a registered name and address are what make the pages meaningful.
 */
export const LEGAL = {
  entity: process.env.NEXT_PUBLIC_LEGAL_ENTITY ?? STORE_NAME,
  address: process.env.NEXT_PUBLIC_BUSINESS_ADDRESS ?? "",
  registration: process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION ?? "",
  jurisdiction: process.env.NEXT_PUBLIC_JURISDICTION ?? "Ghana",
  /** Shown as "Last updated" on every legal page. */
  updated: "23 August 2026",
} as const;
