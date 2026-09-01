"use client";

import * as React from "react";

import { ProductImage } from "@/components/store/product-image";
import { cn } from "@/lib/utils";

/**
 * The main photograph with the rest of the shots as a filmstrip down its left
 * edge. Clicking a thumbnail swaps the large image.
 *
 * The main shot is capped rather than filling its half of the layout: at the
 * full width of a desktop column a square product photo runs taller than the
 * text beside it, which pushed the price and the buy button below the fold.
 * The strip sits tight against the photo so the two read as one object, and
 * scrolls within the photo's height rather than growing past it.
 *
 * `overlay` is the brand and sale badging. It is rendered on the server and
 * passed through so this file does not need the pricing rules to position it.
 */
export function ProductGallery({
  images,
  name,
  overlay,
}: {
  images: string[];
  name: string;
  overlay?: React.ReactNode;
}) {
  const [active, setActive] = React.useState(0);

  // A product whose photographs change under an open page — an admin edit, a
  // client-side navigation to a different product — should not keep pointing
  // at an index that no longer exists.
  const current = images[active] ?? images[0];

  return (
    <div className="p-6 lg:p-8">
      {/* The strip is positioned against the photo rather than sitting beside
          it in the flow: as a flex sibling a tall strip stretched the row and
          pulled the main shot out of square. This way the photo's own aspect
          ratio sets the height and the strip scrolls inside it. */}
      <div className="relative mx-auto w-full max-w-[440px]">
        {images.length > 1 && (
          <ul className="absolute inset-y-0 left-0 flex w-14 flex-col gap-2 overflow-y-auto sm:w-16">
            {images.map((image, index) => {
              const selected = index === active;

              return (
                <li key={image}>
                  <button
                    type="button"
                    onClick={() => setActive(index)}
                    aria-label={`Show photograph ${index + 1} of ${images.length}`}
                    aria-current={selected}
                    className={cn(
                      "relative block size-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors sm:size-16",
                      "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
                      selected
                        ? "border-primary"
                        : "border-foreground/12 hover:border-foreground/40"
                    )}
                  >
                    <ProductImage
                      src={image}
                      alt=""
                      fill
                      sizes="64px"
                      className={cn(
                        "object-cover transition-opacity",
                        selected ? "opacity-100" : "opacity-70 hover:opacity-100"
                      )}
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <div
          className={cn(
            "border-foreground/10 bg-secondary/20 relative aspect-square overflow-hidden rounded-2xl border",
            images.length > 1 && "ml-16 sm:ml-[72px]"
          )}
        >
          <ProductImage
            key={current}
            src={current}
            alt={active === 0 ? name : `${name} — photograph ${active + 1}`}
            fill
            priority
            sizes="(min-width: 1024px) 380px, 80vw"
            className="object-cover"
          />
          {overlay}
        </div>
      </div>
    </div>
  );
}
