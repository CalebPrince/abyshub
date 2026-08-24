import "server-only";

import { unstable_cache } from "next/cache";

import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import {
  CONTACT_EMAIL,
  DELIVERY_FLAT_RATE,
  FREE_DELIVERY_THRESHOLD,
  LEGAL,
  SITE_URL,
  WHATSAPP_NUMBER,
} from "@/lib/config";

export const SETTINGS_TAG = "settings";

export type ShopSettings = {
  siteUrl: string;
  contactEmail: string;
  whatsappNumber: string;
  whatsappEnabled: boolean;
  freeDeliveryThreshold: number;
  deliveryFlatRate: number;
  /** Added to every converted partner price, as whole percent. */
  priceMarkupPercent: number;
  legal: {
    entity: string;
    address: string;
    registration: string;
    jurisdiction: string;
  };
};

function pick(stored: Map<string, string>, key: string, fallback: string) {
  const value = stored.get(key)?.trim();
  return value ? value : fallback;
}

function pickNumber(stored: Map<string, string>, key: string, fallback: number) {
  const raw = stored.get(key)?.trim();
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? Math.round(parsed) : fallback;
}

/**
 * Shop settings, database first and environment second.
 *
 * The environment values are the floor, not a legacy path: an empty database,
 * an unseeded install or an unreachable Supabase all still produce a working
 * shop rather than one with no delivery charge and no way to be contacted.
 *
 * Currency and locale are deliberately absent. They are needed synchronously
 * by formatPrice in components that never touch the server, so they stay
 * environment configuration — which is honest, since changing the currency a
 * shop trades in is a deployment, not a setting.
 */
export const getShopSettings = unstable_cache(
  async (): Promise<ShopSettings> => {
    const stored = new Map<string, string>();

    if (adminClientAvailable()) {
      const supabase = createAdminClient();
      const { data } = await supabase.from("settings").select("key, value");
      for (const row of data ?? []) {
        if (row.value) stored.set(row.key, row.value);
      }
    }

    const whatsappNumber = pick(stored, "whatsapp_number", WHATSAPP_NUMBER);

    return {
      siteUrl: pick(stored, "site_url", SITE_URL),
      contactEmail: pick(stored, "contact_email", CONTACT_EMAIL),
      whatsappNumber,
      whatsappEnabled: whatsappNumber.length > 0,
      freeDeliveryThreshold: pickNumber(
        stored,
        "free_delivery_threshold",
        FREE_DELIVERY_THRESHOLD
      ),
      deliveryFlatRate: pickNumber(stored, "delivery_flat_rate", DELIVERY_FLAT_RATE),
      // No environment fallback and no invented default: zero means the shelf
      // price is the bare converted figure, which is at least honest about
      // carrying no margin until someone sets one.
      priceMarkupPercent: pickNumber(stored, "price_markup_percent", 0),
      legal: {
        entity: pick(stored, "legal_entity", LEGAL.entity),
        address: pick(stored, "business_address", LEGAL.address),
        registration: pick(stored, "business_registration", LEGAL.registration),
        jurisdiction: pick(stored, "jurisdiction", LEGAL.jurisdiction),
      },
    };
  },
  ["shop-settings"],
  { tags: [SETTINGS_TAG], revalidate: 300 }
);

/**
 * A stored credential, or the environment variable behind it.
 *
 * Never call this from anything that renders. It exists so the server can use
 * a key, not so a page can display one.
 */
export async function getSecret(key: string, fallback?: string) {
  if (!adminClientAvailable()) return fallback?.trim() || "";

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("secure_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle();

  return data?.value?.trim() || fallback?.trim() || "";
}
