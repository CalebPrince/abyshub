import { CURRENCY, LOCALE } from "@/lib/config";

/**
 * `en-GH` renders GHS with the symbol jammed against the digits — "GH₵500".
 * Rebuild the string from its parts to breathe a space in there.
 *
 * Driven off the parts rather than a string replace so it stays correct if
 * CURRENCY or LOCALE changes: a space is only inserted where the currency sits
 * directly against a number, and locales that place the symbol after the amount
 * (or already separate it with a literal, as fr-FR does) are left untouched.
 *
 * The space is non-breaking, so a price never wraps between symbol and amount.
 */
function joinWithCurrencySpace(parts: Intl.NumberFormatPart[]) {
  return parts
    .map((part, i) => {
      const next = parts[i + 1];
      if (!next || part.type === "literal" || next.type === "literal") {
        return part.value;
      }
      const straddlesCurrency =
        part.type === "currency" || next.type === "currency";
      // Escaped rather than typed: a literal U+00A0 in source is
      // indistinguishable from an ordinary space.
      return straddlesCurrency ? `${part.value}\u00a0` : part.value;
    })
    .join("");
}

/**
 * Prices are stored and passed around as integer minor units (kobo, pesewas,
 * cents) so no rounding error can creep in before Paystack is charged.
 */
export function formatPrice(minorUnits: number, currency = CURRENCY) {
  return joinWithCurrencySpace(
    new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).formatToParts(minorUnits / 100)
  );
}

/** Same as formatPrice but always shows the decimals — used on totals. */
export function formatPriceExact(minorUnits: number, currency = CURRENCY) {
  return joinWithCurrencySpace(
    new Intl.NumberFormat(LOCALE, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).formatToParts(minorUnits / 100)
  );
}
