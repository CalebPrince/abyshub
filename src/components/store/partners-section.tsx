import Image from "next/image";

import { Reveal } from "@/components/store/reveal";
import { SUPPLIERS } from "@/lib/suppliers/registry";

/**
 * The brands behind the shelves.
 *
 * Read from the supplier registry, so a new partner appears here the moment
 * one is added for importing — the list of who we buy from and the list of who
 * we say we buy from cannot drift apart.
 *
 * Each mark is the partner's own official asset. A partner without one falls
 * back to its name set as a wordmark, which is the honest option: a generated
 * logo would be a fabricated trade mark.
 */
export function PartnersSection() {
  return (
    <section className="border-foreground/12 border-t">
      <div className="mx-auto max-w-[1400px] px-4 py-14 lg:px-8 lg:py-16">
        <Reveal>
          <p className="text-primary text-center text-[11px] font-semibold tracking-[0.24em] uppercase">
            Our partners
          </p>
          <h2 className="font-display mt-2 mb-10 text-center text-2xl leading-none font-extrabold tracking-tight uppercase sm:text-3xl">
            Who we stock
          </h2>

          {/* A single row. Two brands read as a pair here, where stacking them
              made the second look like an afterthought. */}
          <ul className="flex flex-wrap items-center justify-center gap-x-14 gap-y-10 sm:gap-x-24">
            {SUPPLIERS.map((partner) => (
              <li key={partner.id} className="flex flex-col items-center gap-3">
                {partner.logo ? (
                  <Image
                    src={partner.logo}
                    alt={partner.label}
                    width={240}
                    height={64}
                    // Capped by height so marks of different proportions sit on
                    // one optical line rather than one being twice the other.
                    className="h-8 w-auto object-contain sm:h-10"
                  />
                ) : (
                  <span className="font-display text-2xl leading-none font-extrabold tracking-tight uppercase sm:text-3xl">
                    {partner.label}
                  </span>
                )}
                <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
                  {partner.label}
                </span>
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground mt-10 text-center text-xs">
            Authorised reseller. Every item is the genuine article, with its
            warranty intact.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
