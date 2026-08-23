import { CURRENCY, LOCALE } from "@/lib/config";

/**
 * Prices are stored and passed around as integer minor units (kobo, pesewas,
 * cents) so no rounding error can creep in before Paystack is charged.
 */
export function formatPrice(minorUnits: number, currency = CURRENCY) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}

/** Same as formatPrice but always shows the decimals — used on totals. */
export function formatPriceExact(minorUnits: number, currency = CURRENCY) {
  return new Intl.NumberFormat(LOCALE, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(minorUnits / 100);
}
