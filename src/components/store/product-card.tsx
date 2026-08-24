import Image from "next/image";
import Link from "next/link";

import { AddToCartButton } from "@/components/store/add-to-cart-button";
import { formatPrice } from "@/lib/money";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Deliberately not a rounded card in a grid of rounded cards: a hard-edged
 * tile, a black brand strap and a red price rule.
 */
export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const onSale =
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;

  return (
    <article
      className={cn(
        "group border-foreground/12 hover:border-foreground/35 bg-card text-card-foreground relative flex flex-col overflow-hidden rounded-xl border transition-colors",
        className
      )}
    >
      <Link
        href={`/products/${product.slug}`}
        className="relative block aspect-square overflow-hidden"
      >
        <Image
          src={product.image}
          alt={product.name}
          fill
          unoptimized
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 50vw"
          className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />

        <span className="bg-primary text-primary-foreground absolute top-3 left-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
          {product.brand}
        </span>

        {onSale && (
          <span className="bg-primary text-primary-foreground absolute top-3 right-3 rounded-full px-2.5 py-1 text-[10px] font-semibold tracking-[0.14em] uppercase">
            Sale
          </span>
        )}

        {!product.inStock && (
          <span className="bg-background/75 absolute inset-0 grid place-items-center">
            <span className="border-foreground text-foreground rounded-full border px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
              Out of stock
            </span>
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex-1 space-y-1.5">
          {/* The maker's range, stamped rather than badged: the brand pill
              is already on the image, and a second pill here would read as
              a second brand instead of the line within one. */}
          {product.productLine ? (
            <p className="border-foreground/25 text-foreground/70 mb-2 inline-flex border-b pb-1 text-[10px] font-semibold tracking-[0.16em] uppercase">
              {product.productLine}
            </p>
          ) : null}
          <h3 className="font-display leading-tight font-bold">
            <Link
              href={`/products/${product.slug}`}
              className="after:absolute after:inset-0 after:content-['']"
            >
              {product.name}
            </Link>
          </h3>
          <p className="text-muted-foreground line-clamp-2 text-sm">
            {product.tagline}
          </p>
        </div>

        <div className="flex items-end justify-between gap-2">
          <div>
            <div className="bg-primary mb-1.5 h-[3px] w-7 rounded-full" aria-hidden />
            <div className="flex items-baseline gap-2">
              <span className="font-display text-lg font-extrabold tabular-nums">
                {formatPrice(product.price)}
              </span>
              {onSale && (
                <span className="text-muted-foreground text-xs line-through tabular-nums">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>
          </div>

          {/* Sits above the card-wide link so the button stays clickable. */}
          <div className="relative z-10">
            <AddToCartButton product={product} size="sm" label="Add" />
          </div>
        </div>
      </div>
    </article>
  );
}
