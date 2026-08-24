import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/types";

function discount(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return null;
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  );
}

function Tile({ product, large = false }: { product: Product; large?: boolean }) {
  const off = discount(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className={`group border-border bg-card relative flex flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg ${
        large ? "sm:col-span-2 sm:row-span-2" : ""
      }`}
    >
      {off ? (
        <span className="bg-primary text-primary-foreground absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase">
          −{off}%
        </span>
      ) : null}

      <div className={`bg-secondary/60 relative ${large ? "aspect-4/3" : "aspect-square"}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          // The large tile is roughly half the row on desktop and the small
          // ones a quarter, so the browser is told that rather than guessing.
          sizes={
            large
              ? "(min-width: 1024px) 50vw, (min-width: 640px) 66vw, 100vw"
              : "(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
          }
          className="object-contain p-5 transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col justify-between gap-2 p-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
            {product.brand}
          </p>
          <p
            className={`mt-1 font-semibold ${large ? "text-base sm:text-lg" : "line-clamp-2 text-sm"}`}
          >
            {product.name}
          </p>
        </div>

        <p className="flex items-baseline gap-2">
          <span className={`font-semibold ${large ? "text-lg" : "text-sm"}`}>
            {formatPrice(product.price)}
          </span>
          {product.compareAtPrice ? (
            <span className="text-muted-foreground text-xs line-through">
              {formatPrice(product.compareAtPrice)}
            </span>
          ) : null}
        </p>
      </div>
    </Link>
  );
}

/**
 * The offers block.
 *
 * One tall tile carrying the best saving with a bed of smaller ones around it,
 * rather than an even row: an equal grid reads as a search result, while the
 * asymmetry gives the eye somewhere to land first.
 *
 * Discounted stock leads, and featured items fill the rest so the block is
 * never half empty on a week with few offers.
 */
export function OffersGrid({ products }: { products: Product[] }) {
  const discounted = products.filter((p) => discount(p) !== null);
  const rest = products.filter((p) => discount(p) === null);

  // Five tiles: one large plus four, which fills the four-column row exactly.
  const chosen = [...discounted, ...rest].slice(0, 5);
  if (chosen.length === 0) return null;

  const [lead, ...others] = chosen;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            While they last
          </p>
          <h2 className="font-display mt-2 text-3xl leading-none font-extrabold tracking-tight uppercase sm:text-4xl">
            Don&rsquo;t miss these
          </h2>
        </div>

        <Link
          href="/products"
          className="text-primary flex items-center gap-1.5 text-sm font-semibold hover:underline"
        >
          See everything <ArrowRightIcon className="size-4" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
        <Tile product={lead} large />
        {others.map((product) => (
          <Tile key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
