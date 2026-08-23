import type { Category, Product } from "@/lib/types";

/** The house brand sits alongside Tupperware on the shelves. */
export const HOUSE_BRAND = "Abys Home";

export const categories: Category[] = [
  {
    slug: "food-storage",
    name: "Food Storage",
    description:
      "Airtight sets that keep garri dry, stew fresh and the fridge in order.",
    gradient: "from-emerald-600 to-teal-700",
  },
  {
    slug: "kitchen-prep",
    name: "Kitchen Prep",
    description: "Choppers, bowls and cookware that shorten the work.",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    slug: "on-the-go",
    name: "On the Go",
    description: "Lunch sets and bottles built for school runs and long days.",
    gradient: "from-sky-600 to-indigo-700",
  },
  {
    slug: "serveware",
    name: "Serveware",
    description: "Bowls, jugs and trays for when there is company.",
    gradient: "from-rose-500 to-red-700",
  },
  {
    slug: "home-care",
    name: "Home Care",
    description: "The cleaning and organising bits that keep it all running.",
    gradient: "from-violet-600 to-fuchsia-700",
  },
];

/**
 * Placeholder catalogue. Prices are in minor units (kobo) so nothing is ever
 * held as a float. Swap this file for your real inventory — everything else
 * reads from it.
 */
export const products: Product[] = [
  {
    id: "1",
    slug: "modular-dry-storage-set-8-piece",
    name: "Modular Dry Storage Set, 8-piece",
    brand: "Tupperware",
    tagline: "Garri, rice and beans sealed dry for months",
    description:
      "Eight square canisters that stack flush and lock airtight, so nothing draws damp and nothing gets in. The set covers a full pantry shelf: two tall for rice and beans, four mid for garri and semo, two short for spices.",
    price: 8950000,
    compareAtPrice: 11200000,
    category: "food-storage",
    image: "/products/modular-dry-storage-set-8-piece.svg",
    rating: 4.9,
    reviewCount: 318,
    inStock: true,
    featured: true,
    highlights: [
      "Airtight seal keeps dry goods dry through harmattan and rains",
      "Square footprint stacks without wasted shelf space",
      "Eight pieces: 2 tall, 4 mid, 2 short",
      "Lifetime seal warranty from Tupperware",
    ],
  },
  {
    id: "2",
    slug: "round-container-set-5-piece",
    name: "Round Container Set, 5-piece",
    brand: "Tupperware",
    tagline: "Stew, soup and leftovers, sealed and stackable",
    description:
      "Five nesting rounds that go fridge to freezer to microwave without staining or holding smell. The seal holds through a bumpy journey, so cooked stew travels without a spill.",
    price: 4200000,
    category: "food-storage",
    image: "/products/round-container-set-5-piece.svg",
    rating: 4.8,
    reviewCount: 452,
    inStock: true,
    featured: true,
    highlights: [
      "Liquid-tight seal, safe to carry cooked stew",
      "Fridge, freezer and microwave safe",
      "Nests down to one container when empty",
      "Does not stain from palm oil or tomato",
    ],
  },
  {
    id: "3",
    slug: "fridge-produce-keeper",
    name: "Fridge Produce Keeper",
    brand: "Tupperware",
    tagline: "Vegetables that last the week, not two days",
    description:
      "A vented base lifts produce off the moisture that rots it, and the adjustable vent lets you tune airflow for leaves or for tomatoes. Ugu and ewedu keep for a week instead of wilting overnight.",
    price: 2850000,
    category: "food-storage",
    image: "/products/fridge-produce-keeper.svg",
    rating: 4.7,
    reviewCount: 196,
    inStock: true,
    featured: true,
    highlights: [
      "Raised vented base keeps produce out of run-off",
      "Adjustable vent for leaves or fruit",
      "Fits a standard fridge shelf",
      "Lift-out grid for easy washing",
    ],
  },
  {
    id: "4",
    slug: "freezer-block-set-4-piece",
    name: "Freezer Block Set, 4-piece",
    brand: "Tupperware",
    tagline: "Batch-cook once, eat all week",
    description:
      "Four flat blocks sized to freeze a single portion of stew or soup, so you thaw only what you need. They stack square in the freezer instead of sliding around in bags.",
    price: 3600000,
    compareAtPrice: 4300000,
    category: "food-storage",
    image: "/products/freezer-block-set-4-piece.svg",
    rating: 4.6,
    reviewCount: 141,
    inStock: true,
    highlights: [
      "Portion-sized for one meal each",
      "Stays flexible at freezer temperature",
      "Stacks square, no wasted freezer space",
      "Date panel on every lid",
    ],
  },
  {
    id: "5",
    slug: "speedy-chopper",
    name: "Speedy Chopper",
    brand: "Tupperware",
    tagline: "Onions, pepper and ata rodo in seconds, no tears",
    description:
      "Pull the cord and the blades do the work — a full bowl of onions or pepper reduced in about ten pulls. No electricity, nothing to charge, and the bowl doubles as the storage container.",
    price: 3450000,
    category: "kitchen-prep",
    image: "/products/speedy-chopper.svg",
    rating: 4.9,
    reviewCount: 623,
    inStock: true,
    featured: true,
    highlights: [
      "Manual pull cord, no power needed",
      "Stainless blades chop pepper, onion, garlic, ginger",
      "Bowl doubles as a sealed storage container",
      "Comes apart fully for washing",
    ],
  },
  {
    id: "6",
    slug: "mixing-bowl-trio",
    name: "Mixing Bowl Trio",
    brand: "Tupperware",
    tagline: "Three sizes, sealed lids, non-slip base",
    description:
      "Bowls that grip the counter while you beat, then take a lid and go in the fridge. Sizes run from a single egg wash up to a full batch of puff-puff batter.",
    price: 4700000,
    category: "kitchen-prep",
    image: "/products/mixing-bowl-trio.svg",
    rating: 4.7,
    reviewCount: 208,
    inStock: true,
    highlights: [
      "1L, 2.5L and 4L nesting bowls",
      "Non-slip base holds while you whisk",
      "Sealed lids for fridge storage",
      "Pour spout on every bowl",
    ],
  },
  {
    id: "7",
    slug: "microwave-pressure-cooker",
    name: "Microwave Pressure Cooker",
    brand: "Tupperware",
    tagline: "Beans in twenty minutes, in the microwave",
    description:
      "A sealed cooker that builds pressure in a microwave, so beans, rice and tough cuts finish in a fraction of the usual time — and without the gas. The vent releases on its own when it is done.",
    price: 6800000,
    compareAtPrice: 7900000,
    category: "kitchen-prep",
    image: "/products/microwave-pressure-cooker.svg",
    rating: 4.8,
    reviewCount: 287,
    inStock: true,
    featured: true,
    highlights: [
      "Cooks beans in roughly 20 minutes",
      "No gas, no open flame",
      "Self-regulating pressure vent",
      "3L capacity, feeds a family of four",
    ],
  },
  {
    id: "8",
    slug: "lunch-set-with-divider",
    name: "Lunch Set with Divider",
    brand: "Tupperware",
    tagline: "Rice one side, stew the other, nothing leaks",
    description:
      "A divided box that keeps rice from swimming in stew, with a seal that survives a school bag on its side. The divider lifts out when you want one big compartment.",
    price: 1850000,
    category: "on-the-go",
    image: "/products/lunch-set-with-divider.svg",
    rating: 4.8,
    reviewCount: 511,
    inStock: true,
    featured: true,
    highlights: [
      "Leak-tight seal, survives a school bag",
      "Removable divider",
      "Microwave safe with the vent open",
      "Fits a standard lunch bag",
    ],
  },
  {
    id: "9",
    slug: "eco-water-bottle-750ml",
    name: "Eco Water Bottle, 750ml",
    brand: "Tupperware",
    tagline: "One bottle instead of a week of sachets",
    description:
      "A flip-top bottle that seals properly in a bag and pours without glugging. Wide enough at the neck to get a brush in, so it actually gets clean.",
    price: 1250000,
    category: "on-the-go",
    image: "/products/eco-water-bottle-750ml.svg",
    rating: 4.6,
    reviewCount: 389,
    inStock: true,
    highlights: [
      "750ml, seals flat in a bag",
      "One-hand flip top",
      "Wide neck, brush cleans it properly",
      "No taste carried over between fills",
    ],
  },
  {
    id: "10",
    slug: "insulated-travel-tumbler",
    name: "Insulated Travel Tumbler",
    brand: HOUSE_BRAND,
    tagline: "Hot for six hours, cold for twelve",
    description:
      "Double-walled steel that keeps tea hot through a morning commute and zobo cold through an afternoon. The lid seals shut rather than just sitting on top.",
    price: 1590000,
    category: "on-the-go",
    image: "/products/insulated-travel-tumbler.svg",
    rating: 4.5,
    reviewCount: 164,
    inStock: false,
    highlights: [
      "Double-walled stainless steel",
      "6 hours hot, 12 hours cold",
      "Sealing lid, not just a cover",
      "Fits a standard car cup holder",
    ],
  },
  {
    id: "11",
    slug: "serving-bowl-with-lid",
    name: "Serving Bowl with Lid",
    brand: "Tupperware",
    tagline: "Carry it to the party, store what comes back",
    description:
      "Good enough to put on the table and sealed enough to travel with. Take jollof to an owambe and bring the leftovers home in the same bowl.",
    price: 2400000,
    category: "serveware",
    image: "/products/serving-bowl-with-lid.svg",
    rating: 4.7,
    reviewCount: 173,
    inStock: true,
    highlights: [
      "4.5L, serves a crowd",
      "Sealed lid for the journey there and back",
      "Table-ready finish",
      "Stacks with the rest of the range",
    ],
  },
  {
    id: "12",
    slug: "water-jug-2l",
    name: "Water Jug, 2L",
    brand: "Tupperware",
    tagline: "Fridge-door jug that actually seals",
    description:
      "A slim jug that fits the fridge door and seals so it does not take on the smell of everything around it. Pours clean without dribbling down the side.",
    price: 1950000,
    category: "serveware",
    image: "/products/water-jug-2l.svg",
    rating: 4.6,
    reviewCount: 226,
    inStock: true,
    highlights: [
      "Fits a standard fridge door",
      "Seals against fridge odours",
      "Drip-free pour spout",
      "2L capacity",
    ],
  },
  {
    id: "13",
    slug: "microfibre-cloth-set-6-piece",
    name: "Microfibre Cloth Set, 6-piece",
    brand: HOUSE_BRAND,
    tagline: "Cleans glass and steel with water alone",
    description:
      "Six colour-coded cloths so the one for the kitchen never ends up in the bathroom. They lift grease with plain water, which means less spend on chemicals.",
    price: 890000,
    category: "home-care",
    image: "/products/microfibre-cloth-set-6-piece.svg",
    rating: 4.5,
    reviewCount: 142,
    inStock: true,
    highlights: [
      "Six cloths, colour-coded by room",
      "Works with water, no chemicals needed",
      "Machine washable 200+ times",
      "Leaves no lint on glass",
    ],
  },
  {
    id: "14",
    slug: "drawer-organiser-set",
    name: "Drawer Organiser Set",
    brand: HOUSE_BRAND,
    tagline: "Cutlery and utensils, each in its place",
    description:
      "Interlocking trays that size to your drawer instead of rattling around inside it. Deep enough for serving spoons, shallow enough for teaspoons to stay visible.",
    price: 1350000,
    compareAtPrice: 1700000,
    category: "home-care",
    image: "/products/drawer-organiser-set.svg",
    rating: 4.4,
    reviewCount: 97,
    inStock: true,
    highlights: [
      "Interlocking trays fit any drawer width",
      "Two depths for spoons and utensils",
      "Non-slip feet",
      "Wipe clean",
    ],
  },
];

/** Every brand on the shelves, house brand and Tupperware included. */
export const brands: string[] = [
  ...new Set(products.map((product) => product.brand)),
].sort((a, b) => a.localeCompare(b));

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((product) => product.slug === slug);
}

export function getProductById(id: string): Product | undefined {
  return products.find((product) => product.id === id);
}

export function getCategoryBySlug(slug: string): Category | undefined {
  return categories.find((category) => category.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((product) => product.featured);
}

export function getRelatedProducts(product: Product, limit = 4): Product[] {
  return products
    .filter(
      (candidate) =>
        candidate.category === product.category && candidate.id !== product.id
    )
    .slice(0, limit);
}
