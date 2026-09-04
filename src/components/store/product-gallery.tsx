"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { ProductImage } from "@/components/store/product-image";
import { cn } from "@/lib/utils";

/** How far one press of an arrow moves the strip. */
const SCROLL_STEP = 240;

/**
 * The main photograph with the rest of the shots in a row beneath it.
 * Clicking a thumbnail swaps the large image.
 *
 * The strip scrolls sideways rather than wrapping onto a second line, so a
 * product with eight photographs takes the same vertical space as one with
 * three. The arrows appear only when there is something to scroll to, and
 * hide again at each end.
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
  const stripRef = React.useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = React.useState({ left: false, right: false });

  // A product whose photographs change under an open page — an admin edit, a
  // client-side navigation to a different product — should not keep pointing
  // at an index that no longer exists.
  const current = images[active] ?? images[0];

  const measure = React.useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;

    const max = strip.scrollWidth - strip.clientWidth;
    setOverflow({
      // A pixel of slack: fractional widths mean scrollLeft rarely lands
      // exactly on either end, which would leave an arrow enabled forever.
      left: strip.scrollLeft > 1,
      right: strip.scrollLeft < max - 1,
    });
  }, []);

  React.useEffect(() => {
    measure();
    const strip = stripRef.current;
    if (!strip) return;

    const observer = new ResizeObserver(measure);
    observer.observe(strip);
    return () => observer.disconnect();
  }, [measure, images.length]);

  function scrollStrip(direction: -1 | 1) {
    stripRef.current?.scrollBy({
      left: direction * SCROLL_STEP,
      behavior: "smooth",
    });
  }

  // min-w-0 twice over: a grid or flex child defaults to min-content width,
  // which the strip's full row of thumbnails would otherwise set, stretching
  // the column past the viewport instead of scrolling inside it.
  return (
    <div className="min-w-0 px-3 pt-2 pb-4 lg:px-4 lg:pt-3 lg:pb-5">
      <div className="mx-auto w-full max-w-[714px] min-w-0">
        <div className="border-foreground/10 bg-secondary/20 relative aspect-square overflow-hidden rounded-2xl border">
          <ProductImage
            key={current}
            src={current}
            alt={active === 0 ? name : `${name}, photograph ${active + 1}`}
            fill
            priority
            sizes="(min-width: 1024px) 714px, 96vw"
            className="object-cover"
          />
          {overlay}
        </div>

        {images.length > 1 && (
          <div className="relative mt-6">
            <ul
              ref={stripRef}
              onScroll={measure}
              className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((image, index) => {
                const selected = index === active;

                return (
                  <li key={image} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => setActive(index)}
                      aria-label={`Show photograph ${index + 1} of ${images.length}`}
                      aria-current={selected}
                      className={cn(
                        "bg-secondary/30 relative block size-24 overflow-hidden rounded-xl border-2 transition-colors sm:size-28",
                        "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                        selected
                          ? "border-foreground"
                          : "border-transparent hover:border-foreground/25"
                      )}
                    >
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    </button>
                  </li>
                );
              })}
            </ul>

            <StripArrow
              side="left"
              show={overflow.left}
              onClick={() => scrollStrip(-1)}
            />
            <StripArrow
              side="right"
              show={overflow.right}
              onClick={() => scrollStrip(1)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Sits over the end of the strip rather than beside it: putting the arrows
 * outside would narrow the thumbnails on the phone widths where the strip is
 * most likely to overflow in the first place.
 */
function StripArrow({
  side,
  show,
  onClick,
}: {
  side: "left" | "right";
  show: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeftIcon : ChevronRightIcon;

  return (
    <button
      type="button"
      onClick={onClick}
      tabIndex={show ? 0 : -1}
      aria-hidden={!show}
      aria-label={side === "left" ? "Previous photographs" : "More photographs"}
      className={cn(
        "bg-background/90 text-foreground absolute top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full border shadow-sm backdrop-blur transition-opacity",
        "hover:bg-background focus-visible:ring-primary focus-visible:ring-2 focus-visible:outline-none",
        side === "left" ? "-left-1" : "-right-1",
        show ? "opacity-100" : "pointer-events-none opacity-0"
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  );
}
