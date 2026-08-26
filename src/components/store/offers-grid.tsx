import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { formatPrice } from "@/lib/money";
import { Reveal } from "@/components/store/reveal";
import type { Product } from "@/lib/types";

function discount(product: Product) {
  if (!product.compareAtPrice || product.compareAtPrice <= product.price) return null;
  return Math.round(
    ((product.compareAtPrice - product.price) / product.compareAtPrice) * 100
  );
}

function Tile({ product }: { product: Product }) {
  const off = discount(product);

  return (
    <Link
      href={`/products/${product.slug}`}
      className="group border-border bg-card relative flex h-full flex-col overflow-hidden rounded-2xl border transition-shadow hover:shadow-lg"
    >
      {off ? (
        <span className="bg-primary text-primary-foreground absolute top-3 left-3 z-10 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase">
          −{off}%
        </span>
      ) : null}

      <div className="bg-secondary/60 relative aspect-4/3 overflow-hidden">
        <Image
          src={product.image}
          alt={product.name}
          fill
          sizes="(min-width: 1280px) 20vw, (min-width: 768px) 33vw, 50vw"
          className="object-contain p-3 transition-transform duration-500 group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-col gap-2 p-4">
        <div>
          <p className="text-muted-foreground text-[10px] font-semibold tracking-[0.16em] uppercase">
            {product.brand}
          </p>
          <p className="mt-1 line-clamp-2 text-sm font-semibold">
            {product.name}
          </p>
        </div>

        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-sm font-semibold">
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
 * Never shows something sold out — a "while they last" tile that can't
 * actually be bought is worse than an empty slot. Discounted stock leads,
 * featured items fill next, and anything still available tops up the rest
 * at random so the block isn't half empty while most of the catalogue sits
 * unconfirmed for Ghana.
 */
export function OffersGrid({ products }: { products: Product[] }) {
  const available = products.filter((p) => p.inStock);
  const discounted = available.filter((p) => discount(p) !== null);
  const featured = available.filter((p) => discount(p) === null && p.featured);
  const rest = available.filter((p) => discount(p) === null && !p.featured);

  const picked = [...discounted, ...featured];
  const filler =
    picked.length < 5 ? [...rest].sort(() => Math.random() - 0.5) : [];

  // A compact five-item shelf keeps modest source images close to their useful
  // display size instead of stretching one product across half the page.
  const chosen = [...picked, ...filler].slice(0, 5);
  if (chosen.length === 0) return null;

  return (
    <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
      <Reveal className="mb-8 flex flex-wrap items-end justify-between gap-4">
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
      </Reveal>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-5">
        {chosen.map((product, index) => (
          <Reveal key={product.id} delay={Math.min(index * 70, 280)} className="h-full">
            <Tile product={product} />
          </Reveal>
        ))}
      </div>
    </section>
  );
}
