import { matchCategory, type Supplier } from "@/lib/suppliers/types";

/**
 * Every partner brand the catalogue can be fed from.
 *
 * To add the next one, append a definition. Nothing else in the import path
 * knows a supplier by name: the allowlist, the dialog's help text and the
 * admin's supplier filter are all derived from this list.
 */
export const SUPPLIERS: Supplier[] = [
  {
    id: "tupperware",
    label: "Tupperware",
    hosts: ["tupperware.com", "www.tupperware.com"],
    defaultBrand: "Tupperware",
    logo: "/partners/tupperware.png",
    blurb:
      "Airtight food storage, prep tools and serveware, with the lifetime seal warranty intact.",
    currency: "USD",
    sitemapUrl: "https://www.tupperware.com/sitemap.xml",
    // Barantus Sales is the sole authorised Tupperware distributor for Ghana,
    // but they have no catalogue website — only social media. That has to be
    // checked by eye, product by product.
    ghanaCheck: {
      note: "Barantus Sales is the authorised Ghana distributor. They sell through social media, not a website, so stock has to be checked by eye.",
      links: [
        { label: "Tupperware Ghana — Instagram", url: "https://www.instagram.com/tupperware_ghana/" },
        { label: "Tupperware Ghana — Facebook", url: "https://www.facebook.com/tupperwareghana/" },
      ],
    },
    categoryFor: ({ supplierCategory, name }) =>
      matchCategory(
        `${supplierCategory ?? ""} ${name}`,
        [
          [/lunch|tumbler|bottle|sipper|on the go|flask/, "on-the-go"],
          [/bowl|jug|tray|serve|platter|dish/, "serveware"],
          [/chop|prep|knife|grate|peel|cook|microwave|mix/, "kitchen-prep"],
          [/clean|organis|organiz|laundry|home care/, "home-care"],
          [/storage|container|canister|freezer|fridge|modular|seal|keeper/, "food-storage"],
        ],
        "food-storage"
      ),
  },
  {
    id: "oriflame",
    label: "Oriflame",
    hosts: ["ng.oriflame.com", "oriflame.com", "www.oriflame.com"],
    // Their pages name a sub-brand — Feminelle, NovAge and so on — which is
    // more useful on a product card than the parent company, so the page wins
    // and this is only the fallback.
    defaultBrand: "Oriflame",
    logo: "/partners/oriflame.svg",
    blurb:
      "Swedish skincare, cosmetics and fragrance, sourced through the authorised network.",
    currency: "NGN",
    sitemapUrl: "https://ng.oriflame.com/SiteMap/SiteMapXmlCatalog",
    // Oriflame closed its official Ghana operation on 30 September 2023 —
    // gh.oriflame.com now shows a closure notice and points Ghana enquiries
    // at Nigeria customer service. Nothing pulled from ng.oriflame.com is
    // sold through an official Ghana channel any more, so every import needs
    // a real source before it can be trusted as available.
    ghanaCheck: {
      note: "Oriflame Ghana closed on 30 Sept 2023 (gh.oriflame.com shows a closure notice). Nothing here has an official Ghana channel — confirm through whatever supply you actually use before listing it as available.",
      links: [{ label: "Oriflame Ghana closure notice", url: "https://gh.oriflame.com/" }],
    },
    categoryFor: ({ supplierCategory, name }) =>
      matchCategory(
        `${supplierCategory ?? ""} ${name}`,
        [
          [/shampoo|conditioner|hair|styling/, "hair"],
          [/perfume|fragrance|eau de|cologne|scent|parfum/, "fragrance"],
          [/lipstick|mascara|foundation|concealer|blush|eyeshadow|nail|makeup|make-up|brow|liner/, "makeup"],
          [/serum|cream|moistur|cleanser|toner|skin|face|anti-age|spf|sunscreen/, "skincare"],
          [/wash|shower|soap|deodorant|lotion|body|bath|intimate|hand/, "bath-body"],
          [/supplement|vitamin|wellness|shake|nutri/, "wellness"],
        ],
        "skincare"
      ),
  },
];

export function supplierById(id: string) {
  return SUPPLIERS.find((supplier) => supplier.id === id) ?? null;
}

/** The supplier a URL belongs to, or null if it is not a partner we import from. */
export function supplierForUrl(url: URL) {
  const host = url.hostname.toLowerCase();
  return SUPPLIERS.find((supplier) => supplier.hosts.includes(host)) ?? null;
}

/** Every host any partner is served from — the fetch allowlist. */
export function allowedHosts() {
  return new Set(SUPPLIERS.flatMap((supplier) => supplier.hosts));
}
