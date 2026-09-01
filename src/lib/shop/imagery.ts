/**
 * Lifestyle photography, mapped to the shelf it belongs to.
 *
 * Every shelf has its own frame, and none of them appear in the hero album:
 * a picture used twice on one page stops being photography and starts
 * looking like a placeholder.
 *
 * These are scene shots — a room, a person, a moment. Nothing here is a
 * product listing, because a generated picture cannot show a real product
 * honestly: asked for a specific set it invents a plausible one, and a
 * customer would be looking at something that cannot be bought. Every actual
 * product on the site uses the supplier's own photograph instead.
 */
const BY_CATEGORY: Record<string, string> = {
  "food-storage": "/categories/food-storage.webp",
  "kitchen-prep": "/categories/kitchen-prep.webp",
  "on-the-go": "/categories/on-the-go.webp",
  serveware: "/categories/serveware.webp",
  "home-care": "/categories/home-care.webp",
  skincare: "/categories/skincare.webp",
  "bath-body": "/categories/bath-body.webp",
  makeup: "/categories/makeup.webp",
  fragrance: "/categories/fragrance.webp",
  hair: "/categories/hair.webp",
  wellness: "/categories/wellness.webp",
};

const FALLBACK = "/categories/food-storage.webp";

export function categoryImage(slug: string) {
  return BY_CATEGORY[slug] ?? FALLBACK;
}

/**
 * The backdrop for a brand's own page.
 *
 * Keyed on the brand written on the product, not the partner id: an Oriflame
 * import can carry a sub-brand — Feminelle, NovAge — and those get their own
 * page. Anything unrecognised falls back to the shop's own frame, so a new
 * brand looks deliberate on the day it lands rather than broken.
 */
const BY_BRAND: Record<string, string> = {
  tupperware: "/lifestyle/kitchen-hero.webp",
  oriflame: "/lifestyle/beauty.webp",
  feminelle: "/categories/bath-body.webp",
  // Stand-ins until the client supplies their own photography. Both are
  // already licensed for this site, which borrowed pictures would not be.
  "jibu water": "/categories/wellness.webp",
  jibu: "/categories/wellness.webp",
  jbco: "/categories/hair.webp",
  novage: "/lifestyle/skincare.webp",
};

const BRAND_FALLBACK = "/lifestyle/hero.webp";

export function brandImage(brand: string) {
  return BY_BRAND[brand.trim().toLowerCase()] ?? BRAND_FALLBACK;
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

/**
 * The hero slider.
 *
 * Each slide is a whole argument, not just a picture: its own eyebrow,
 * headline, paragraph and button, crossfading together with the photograph on
 * the right. The album this replaced showed six thumbnails at once and said
 * one thing underneath them all; this gets to make the kitchen case and the
 * beauty case separately, in their own words, which is what the shop actually
 * needed — it sells two ranges and only ever pitched one.
 *
 * `focus` matters more than it did. Every frame is composed with the subject
 * weighted right and the left third left soft, so the scrim that dissolves the
 * picture into the headline eats empty wall rather than a face. A
 * centre-weighted shot dropped into this list will look wrong in a way that is
 * hard to place.
 *
 * The button label is per-slide too, so it names the range the picture is
 * making the case for. Both still land on the full products page: pointing
 * each at its own shelf is a one-line change to `href`, and worth making once
 * the live catalogue is confirmed to carry a matching category slug.
 *
 * The headline is segmented rather than a string because one phrase in it is
 * set in the brand pink, and which phrase is a per-slide decision. Each inner
 * array is a rendered line — and a line is a hard promise, not a suggestion:
 * at this type size the column takes about twelve characters before it wraps
 * on its own and the break lands somewhere nobody chose.
 *
 * PLACEHOLDERS: both photographs are generated stand-ins holding unbranded
 * stock, so nothing on screen claims to be a product that can be bought. They
 * come out the moment the client's own product photographs arrive, at which
 * point the renders are conditioned on those photographs and the thing in
 * frame is the thing in the basket. The second slide's copy is a first draft
 * of the beauty pitch and wants the client's eye on it.
 */
export const HERO_SLIDES = [
  {
    src: "/lifestyle/hero-slide-01.webp",
    alt: "Carrying a stack of sealed food storage containers through a kitchen",
    focus: "object-right",
    eyebrow: "Genuine Tupperware · and more",
    headline: [
      [{ text: "Buy it once." }],
      [{ text: "Keep it", accent: true }, { text: " for" }],
      [{ text: "years." }],
    ],
    body: "Airtight storage, prep tools and home goods that survive daily use in a real kitchen — not the kind that cracks by the second harmattan.",
    cta: "Shop the kitchen range",
    href: "/products",
  },
  {
    src: "/lifestyle/hero-slide-02.webp",
    alt: "Holding a skincare bottle at a bright bathroom vanity",
    focus: "object-right",
    eyebrow: "Skincare · bath · body",
    headline: [
      [{ text: "Good skin is" }],
      [{ text: "a routine,", accent: true }],
      [{ text: "not a treat." }],
    ],
    body: "Cleansers, body care and everyday beauty picked the same way as the kitchen range — things worth buying again, not things that look good once.",
    cta: "Shop the beauty range",
    href: "/products",
  },
] as const;

export type HeroSlide = (typeof HERO_SLIDES)[number];
