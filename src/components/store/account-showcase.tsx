import Image from "next/image";

import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/types";

/**
 * The panel beside the account forms.
 *
 * Shows real stock rather than decoration: someone signing in is already
 * mid-shop, and three things they can actually buy is a better use of half a
 * screen than a stock photograph on its own.
 *
 * Hidden below `lg`, where a phone should get the form and nothing competing
 * with it.
 */
export function AccountShowcase({
  products,
  eyebrow,
  heading,
  body,
}: {
  products: Product[];
  eyebrow: string;
  heading: React.ReactNode;
  body: string;
}) {
  const [lead, ...rest] = products;

  return (
    <aside className="bg-primary text-primary-foreground relative hidden overflow-hidden lg:flex lg:flex-col lg:justify-between lg:p-12">
      {/* The house hatch, barely there, so the panel is not a flat slab. */}
      <div className="hatch pointer-events-none absolute inset-0 opacity-[0.14]" />

      <div className="relative">
        <p className="text-primary-foreground/75 text-[11px] font-semibold tracking-[0.24em] uppercase">
          {eyebrow}
        </p>
        <h2 className="font-display mt-3 max-w-md text-4xl leading-[0.95] font-extrabold tracking-tight uppercase xl:text-5xl">
          {heading}
        </h2>
        <p className="text-primary-foreground/80 mt-4 max-w-sm text-sm">{body}</p>
      </div>

      {/* A tall lead image with two stacked beside it — an even grid of three
          would read as a search result rather than a shopfront. */}
      <div className="relative mt-10 grid grid-cols-5 gap-3">
        {lead ? (
          <figure className="col-span-3 overflow-hidden rounded-2xl bg-white/95">
            <div className="relative aspect-4/5">
              <Image
                src={lead.image}
                alt={lead.name}
                fill
                sizes="(min-width: 1024px) 22vw, 0px"
                className="object-contain p-6"
              />
            </div>
            <figcaption className="text-foreground border-foreground/10 border-t px-4 py-3">
              <p className="truncate text-sm font-semibold">{lead.name}</p>
              <p className="text-primary text-sm font-semibold">
                {formatPrice(lead.price)}
              </p>
            </figcaption>
          </figure>
        ) : null}

        <div className="col-span-2 flex flex-col gap-3">
          {rest.slice(0, 2).map((product) => (
            <figure
              key={product.id}
              className="flex-1 overflow-hidden rounded-2xl bg-white/95"
            >
              <div className="relative aspect-square">
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(min-width: 1024px) 14vw, 0px"
                  className="object-contain p-4"
                />
              </div>
              <figcaption className="text-foreground border-foreground/10 border-t px-3 py-2">
                <p className="truncate text-xs font-semibold">{product.name}</p>
                <p className="text-primary text-xs font-semibold">
                  {formatPrice(product.price)}
                </p>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>

      <p className="text-primary-foreground/70 relative mt-8 text-xs">
        Genuine Tupperware and Oriflame, delivered nationwide.
      </p>
    </aside>
  );
}
