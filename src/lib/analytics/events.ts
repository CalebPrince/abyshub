/**
 * The storefront funnel, named once and shared by the tracker, the API route
 * and the back office, so a renamed event cannot quietly stop being counted.
 */
export const EVENT_NAMES = [
  "page_view",
  "product_view",
  "search",
  "add_to_cart",
  "begin_checkout",
  "checkout_method",
  "purchase",
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export type SiteEvent = {
  name: EventName;
  path?: string;
  productSlug?: string;
  searchTerm?: string;
  method?: string;
  /** Minor units, for the events that carry a basket. */
  value?: number;
};

/** The steps of the funnel, in the order the back office reports them. */
export const FUNNEL: { name: EventName; label: string }[] = [
  { name: "page_view", label: "Visited" },
  { name: "product_view", label: "Viewed a product" },
  { name: "add_to_cart", label: "Added to basket" },
  { name: "begin_checkout", label: "Started checkout" },
  { name: "purchase", label: "Paid" },
];
