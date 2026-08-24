import Image from "next/image";

import { SUPPLIERS } from "@/lib/suppliers/registry";

/**
 * The brands behind the shelves.
 *
 * Read from the supplier registry, so a new partner appears here the moment
 * one is added for importing — the list of who we buy from and the list of who
 * we say we buy from cannot drift apart.
 *
 * A partner with no official logo file yet is set as a wordmark. That is the
 * honest option: a generated logo would be a fabricated trade mark, and
 * hotlinking whatever seasonal graphic a partner is serving today breaks the
 * week they change it.
 */
export function PartnersSection() {
  return (
    <section className="border-foreground/12 border-t">
      <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-20">
        <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
          Our partners
        </p>
        <h2 className="font-display mt-2 mb-8 text-3xl leading-none font-extrabold tracking-tight uppercase sm:text-4xl">
          Who we stock
        </h2>

        {/* One per row: two brands side by side read as a comparison, and a
            stacked column gives each its own line to speak on. */}
        <ul className="divide-border border-border divide-y overflow-hidden rounded-2xl border">
          {SUPPLIERS.map((partner) => (
            <li
              key={partner.id}
              className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8"
            >
              <div className="flex w-full shrink-0 items-center sm:w-56">
                {partner.logo ? (
                  <Image
                    src={partner.logo}
                    alt={partner.label}
                    width={220}
                    height={64}
                    className="h-9 w-auto object-contain"
                  />
                ) : (
                  <span className="font-display text-2xl leading-none font-extrabold tracking-tight uppercase sm:text-3xl">
                    {partner.label}
                  </span>
                )}
              </div>

              {partner.blurb ? (
                <p className="text-muted-foreground text-sm">{partner.blurb}</p>
              ) : null}
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground mt-4 text-xs">
          Authorised reseller. Every item is the genuine article, with its
          warranty intact.
        </p>
      </div>
    </section>
  );
}
