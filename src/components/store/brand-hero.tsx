import Image from "next/image";

import { brandImage } from "@/lib/shop/imagery";
import { SUPPLIERS } from "@/lib/suppliers/registry";

/**
 * The banner at the top of a brand's page.
 *
 * Matched on the brand written on the product rather than the partner id: an
 * import can carry a sub-brand, and those get a page too. A partner we know
 * lends its logo and its one line; anything else still gets its name set
 * large over a backdrop, so every brand page reads as its own place instead
 * of the same shop listing with a different filter.
 *
 * The ranges that have no products yet use the same banner from their own
 * page, which is why the count, the blurb and the picture can all be given
 * rather than looked up.
 */
export function BrandHero({
  brand,
  count,
  image,
  blurb,
  eyebrow,
}: {
  brand: string;
  /** Omitted where there is no listing beneath, a range not yet stocked. */
  count?: number;
  image?: string;
  blurb?: string;
  eyebrow?: string;
}) {
  const partner = SUPPLIERS.find(
    (supplier) =>
      supplier.defaultBrand.toLowerCase() === brand.toLowerCase() ||
      supplier.label.toLowerCase() === brand.toLowerCase()
  );

  return (
    <section className="relative isolate mb-10 overflow-hidden rounded-2xl">
      <Image
        src={image ?? brandImage(brand)}
        alt=""
        fill
        priority
        sizes="(min-width: 1400px) 1336px, 100vw"
        className="object-cover"
      />
      {/* Weighted to the left, where the words are: an even wash over the
          whole frame dims the photograph without making the text any easier
          to read. */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20"
        aria-hidden
      />

      <div className="relative px-6 py-14 sm:px-10 sm:py-20 lg:py-24">
        {partner?.logo ? (
          // The partner's own mark, on a plate: these are supplied as dark
          // artwork for light packaging and vanish against the photograph.
          <span className="mb-6 inline-flex items-center rounded-xl bg-white/95 px-4 py-2.5">
            <Image
              src={partner.logo}
              alt={`${partner.label} logo`}
              width={132}
              height={34}
              className="h-7 w-auto object-contain"
            />
          </span>
        ) : (
          <p className="text-[11px] font-semibold tracking-[0.24em] text-white/70 uppercase">
            {eyebrow ?? "Brand"}
          </p>
        )}

        <h1 className="font-display text-4xl font-extrabold tracking-tight text-white uppercase sm:text-6xl">
          {brand}
        </h1>

        <p className="mt-4 max-w-xl text-sm leading-6 text-white/80 sm:text-base">
          {blurb ?? partner?.blurb ?? `Everything we stock from ${brand}.`}
        </p>

        {count !== undefined ? (
          <p className="mt-6 text-[11px] font-bold tracking-[0.18em] text-white/70 uppercase">
            {count} {count === 1 ? "product" : "products"}
          </p>
        ) : null}
      </div>
    </section>
  );
}
