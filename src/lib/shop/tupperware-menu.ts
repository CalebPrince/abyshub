/**
 * The Tupperware shop menu, mirroring the maker's own.
 *
 * The catalogue's shelves are flat, so none of these are real categories.
 * Each one is a search instead, and the terms are deliberately single words
 * with the ending trimmed off: `matchesQuery` requires *every* term to appear
 * somewhere in the product, so "Mixing Bowls & Measuring Tools" as written
 * would match nothing, while "mixing" matches the bowls it is meant to.
 *
 * A column with no matching stock shows an empty shelf rather than a broken
 * link. Swap `search` for a real category here the day the taxonomy grows.
 */
export type MenuEntry = {
  label: string;
  /** Single search term, or an explicit href for the entries that are not searches. */
  search?: string;
  href?: string;
};

export type MenuColumn = {
  heading: string;
  /** The nearest real shelf, when the column maps onto one. */
  category?: string;
  entries: MenuEntry[];
};

/**
 * Sits above the columns rather than inside one. Asked for by the client, and
 * right anyway: the whole range is the most common thing to want, and hunting
 * for it in the sixth column is a worse start than seeing it first.
 */
export const SHOP_ALL: MenuEntry = {
  label: "Shop All Tupperware",
  href: "/products?brand=Tupperware",
};

export const TUPPERWARE_MENU: MenuColumn[] = [
  {
    heading: "Food Storage",
    category: "food-storage",
    entries: [
      { label: "Glassware", search: "glass" },
      { label: "Fridge Storage", search: "fridge" },
      { label: "Freezer Storage", search: "freezer" },
      { label: "Pantry Organization", search: "pantry" },
      { label: "Microwave Reheating", search: "microwave" },
      { label: "Vintage", search: "vintage" },
    ],
  },
  {
    heading: "Kitchen Tools & Gadgets",
    category: "kitchen-prep",
    entries: [
      { label: "Utensils", search: "utensil" },
      { label: "Gadgets", search: "gadget" },
      { label: "Cutlery", search: "knife" },
      { label: "Spoons & Spatulas", search: "spatula" },
      { label: "Mixing Bowls & Measuring Tools", search: "mixing" },
      { label: "Mandolines & Graters", search: "grater" },
      { label: "Specialty Prep Tools", search: "prep" },
    ],
  },
  {
    heading: "Cooking & Baking",
    entries: [
      { label: "Baking Dishes", search: "baking" },
      { label: "Microwave Cooking", search: "microwave" },
      { label: "Silicone Baking", search: "silicone" },
      { label: "Stovetop & Oven", search: "oven" },
    ],
  },
  {
    heading: "Serveware & Entertaining",
    category: "serveware",
    entries: [
      { label: "Beverage Dispensers", search: "dispenser" },
      { label: "Plates and Bowls", search: "plate" },
      { label: "Serving Bowls", search: "serving" },
      { label: "Serving Solutions", search: "serve" },
      { label: "Tumblers & Mugs", search: "tumbler" },
      { label: "Vintage", search: "vintage" },
    ],
  },
  {
    heading: "On-the-Go Essentials",
    category: "on-the-go",
    entries: [
      { label: "Lunch & Snacks", search: "lunch" },
      { label: "Drinks", search: "drink" },
      { label: "Entertaining", search: "entertain" },
      { label: "Thermal Tumblers & Mugs", search: "thermal" },
      { label: "Water Bottles", search: "bottle" },
    ],
  },
  {
    heading: "Other",
    entries: [
      { label: "Tupperware Cookbook", search: "cookbook" },
      { label: "Kids Feeding & Mealtime", search: "kids" },
      { label: "Toys & Playtime", search: "toy" },
      { label: "Vintage Shop", search: "vintage" },
      { label: "Sale Shop", href: "/products?brand=Tupperware&sale=1" },
      { label: "Last Chance", href: "/products?brand=Tupperware&sale=1" },
    ],
  },
];

/** Everything below the Tupperware menu stays inside the Tupperware range. */
export function menuHref(entry: MenuEntry) {
  if (entry.href) return entry.href;
  return `/products?brand=Tupperware&q=${encodeURIComponent(entry.search ?? "")}`;
}

export function columnHref(column: MenuColumn) {
  return column.category
    ? `/products?brand=Tupperware&category=${column.category}`
    : "/products?brand=Tupperware";
}
