/**
 * Lifestyle photography, mapped to the shelf it belongs to.
 *
 * These are scene shots — a room, a person, a moment. Nothing here is a
 * product listing, because a generated picture cannot show a real product
 * honestly: asked for a specific set it invents a plausible one, and a
 * customer would be looking at something that cannot be bought. Every actual
 * product on the site uses the supplier's own photograph instead.
 */
const BY_CATEGORY: Record<string, string> = {
  "food-storage": "/lifestyle/kitchen-hero.webp",
  "kitchen-prep": "/lifestyle/serveware.webp",
  "on-the-go": "/lifestyle/on-the-go.webp",
  serveware: "/lifestyle/serveware.webp",
  "home-care": "/lifestyle/pantry-portrait.webp",
  skincare: "/lifestyle/skincare.webp",
  "bath-body": "/lifestyle/skincare.webp",
  makeup: "/lifestyle/makeup.webp",
  fragrance: "/lifestyle/makeup.webp",
  hair: "/lifestyle/skincare.webp",
  wellness: "/lifestyle/pantry-portrait.webp",
};

const FALLBACK = "/lifestyle/kitchen-hero.webp";

export function categoryImage(slug: string) {
  return BY_CATEGORY[slug] ?? FALLBACK;
}

/**
 * The hero album.
 *
 * Six frames rather than one, covering both partners — the kitchen side and
 * the beauty side — so the top of the page says what the shop sells before a
 * word is read. Order matters: the columns stagger against each other, and
 * these are laid out tall, square, tall so the rhythm holds.
 */
export const HERO_ALBUM = [
  // `focus` matters: three of these were shot wide with the left third left
  // deliberately empty for headline text. Cropped to a portrait frame on
  // default centring, that empty wall is all you get — so they anchor right,
  // where the subject actually is.
  {
    src: "/lifestyle/hero.webp",
    alt: "Sealing a storage canister at a kitchen counter",
    tall: true,
    focus: "object-right",
  },
  {
    src: "/lifestyle/beauty.webp",
    alt: "Applying skincare at a bright bathroom mirror",
    tall: false,
    focus: "object-right",
  },
  {
    src: "/lifestyle/commute.webp",
    alt: "Heading out with a packed lunch and a water bottle",
    tall: false,
    focus: "object-right",
  },
  {
    src: "/lifestyle/serveware.webp",
    alt: "Serving a meal at a laid table",
    tall: true,
    focus: "object-center",
  },
  {
    src: "/lifestyle/pantry-portrait.webp",
    alt: "Carrying a stack of storage containers",
    tall: true,
    focus: "object-center",
  },
  {
    src: "/lifestyle/makeup.webp",
    alt: "Applying lipstick at a sunlit dressing table",
    tall: false,
    focus: "object-center",
  },
] as const;

export const LIFESTYLE = {
  kitchen: "/lifestyle/kitchen-hero.webp",
  onTheGo: "/lifestyle/on-the-go.webp",
  serveware: "/lifestyle/serveware.webp",
  skincare: "/lifestyle/skincare.webp",
  makeup: "/lifestyle/makeup.webp",
  pantry: "/lifestyle/pantry-portrait.webp",
} as const;
