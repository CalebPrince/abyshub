/**
 * Storefront configuration. Everything here is safe to expose to the browser —
 * the Paystack *secret* key is read only in server code (see lib/paystack.ts).
 */

/**
 * A variable declared in a dashboard but left blank arrives as "", which `??`
 * happily passes through — and an empty string is worse than a missing one:
 * `new URL("")` throws, `Intl.NumberFormat("")` throws, and `Number("")` is 0,
 * which would quietly make every order qualify for free delivery. Treat blank
 * as unset everywhere.
 *
 * The `process.env.NEXT_PUBLIC_*` reads stay written out in full at each call
 * site because Next inlines that exact expression at build time; a dynamic
 * lookup would not be replaced.
 */
function env(value: string | undefined, fallback: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

/** Same, for the amounts — a blank or unparseable value falls back too. */
function envNumber(value: string | undefined, fallback: number) {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * ISO 4217 code Paystack charges in. Paystack supports NGN, GHS, ZAR, KES and
 * USD; the account must be enabled for whichever you set here.
 */
export const CURRENCY = env(process.env.NEXT_PUBLIC_CURRENCY, "GHS");

/** Locale used to format prices. */
export const LOCALE = env(process.env.NEXT_PUBLIC_LOCALE, "en-GH");

/** Where customers reach the shop for WhatsApp orders. Digits only, with country code. */
export const WHATSAPP_NUMBER = env(process.env.NEXT_PUBLIC_WHATSAPP_NUMBER, "");

export const CONTACT_EMAIL = env(
  process.env.NEXT_PUBLIC_CONTACT_EMAIL,
  "orders@abyshub.com"
);

/**
 * Must be the real origin in production: it is what Paystack is handed as the
 * callback URL, so a fallback to localhost here means a broken return journey
 * after payment rather than a broken build.
 */
export const SITE_URL = env(
  process.env.NEXT_PUBLIC_SITE_URL,
  "http://localhost:3000"
);

/** Safe browser-facing Paystack identifier. This is not the secret key. */
export const PAYSTACK_PUBLIC_KEY = env(
  process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY,
  ""
);

export const STORE_NAME = "Abys Hub";

/** The name the chat assistant introduces herself by. */
export const ASSISTANT_NAME = "Mimi";

/** Order totals, all in minor units of CURRENCY (pesewas). */
export const FREE_DELIVERY_THRESHOLD = envNumber(
  process.env.NEXT_PUBLIC_FREE_DELIVERY_THRESHOLD,
  100000
);

export const DELIVERY_FLAT_RATE = envNumber(
  process.env.NEXT_PUBLIC_DELIVERY_FLAT_RATE,
  3500
);

/** True when a WhatsApp number is configured, so the UI can hide the option. */
export const whatsappEnabled = WHATSAPP_NUMBER.length > 0;

/**
 * Details the legal pages need. Anything left blank is omitted from the page
 * rather than printed as an empty placeholder — but fill them in before you
 * trade: a registered name and address are what make the pages meaningful.
 */
export const LEGAL = {
  entity: env(process.env.NEXT_PUBLIC_LEGAL_ENTITY, STORE_NAME),
  address: env(process.env.NEXT_PUBLIC_BUSINESS_ADDRESS, ""),
  registration: env(process.env.NEXT_PUBLIC_BUSINESS_REGISTRATION, ""),
  jurisdiction: env(process.env.NEXT_PUBLIC_JURISDICTION, "Ghana"),
  /** Shown as "Last updated" on every legal page. */
  updated: "23 August 2026",
} as const;
