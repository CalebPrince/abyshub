import "server-only";

import { unstable_cache } from "next/cache";

import { CURRENCY } from "@/lib/config";

/**
 * Today's exchange rates, for turning a partner's list price into ours.
 *
 * Partners quote in their own money — Tupperware in dollars, Oriflame in naira
 * — and a shelf price in cedis has to come from somewhere. This is the
 * somewhere: one public table of daily rates, held for six hours so that a
 * four-hundred product import prices its whole run on a single number rather
 * than drifting partway through.
 *
 * The rate is never guessed. If the table cannot be reached the caller is
 * handed null and is expected to stop, because a catalogue priced off a
 * hardcoded fallback is worse than a catalogue with no prices in it.
 */

const RATES_URL = "https://open.er-api.com/v6/latest/";

const FX_TTL = 6 * 3600;

export const FX_TAG = "exchange-rates";

const loadRates = unstable_cache(
  async (base: string): Promise<Record<string, number> | null> => {
    try {
      const response = await fetch(`${RATES_URL}${encodeURIComponent(base)}`, {
        signal: AbortSignal.timeout(10_000),
        cache: "no-store",
      });
      if (!response.ok) return null;

      const body = (await response.json()) as {
        result?: string;
        rates?: Record<string, number>;
      };
      if (body.result !== "success" || !body.rates) return null;
      return body.rates;
    } catch {
      // An unreachable rate table is a "we cannot price this today", not a
      // crash in the middle of someone's import.
      return null;
    }
  },
  ["exchange-rates"],
  { revalidate: FX_TTL, tags: [FX_TAG] }
);

/** Units of the shop's currency one unit of `from` buys, or null if unknown. */
export async function rateToShopCurrency(from: string) {
  const base = from.trim().toUpperCase();
  if (!base) return null;
  if (base === CURRENCY) return 1;

  const rates = await loadRates(base);
  const rate = rates?.[CURRENCY];
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0 ? rate : null;
}

/**
 * A partner's price, in our money, in minor units.
 *
 * The markup is the owner's own: a mid-market rate is what banks quote each
 * other, not what anyone pays to actually move money, and a reseller's price
 * has to carry a margin besides. Rounded up to the whole cedi, because
 * GH₵184.37 reads as arithmetic left on display and rounding up never lands
 * beneath the converted figure.
 */
export function toShopMinorUnits(
  listPrice: number,
  rate: number,
  markupPercent: number
) {
  const converted = listPrice * rate * (1 + markupPercent / 100);
  if (!Number.isFinite(converted) || converted <= 0) return 0;
  return Math.ceil(converted) * 100;
}
