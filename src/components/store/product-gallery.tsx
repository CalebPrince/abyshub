"use client";

import * as React from "react";
import Image from "next/image";
import { ChevronLeftIcon, ChevronRightIcon, PlayIcon } from "lucide-react";

import { ProductImage } from "@/components/store/product-image";
import { useProductVariant } from "@/components/store/product-variant-context";
import { cn } from "@/lib/utils";

/** How far one press of an arrow moves the strip. */
const SCROLL_STEP = 240;

export type GalleryVariant = { name: string; image: string };

/**
 * The variant picker itself — Amazon puts this beside the photographs, not
 * underneath them, so it lives here as its own component rather than inside
 * ProductGallery, and the page places it in the info column. Reads and
 * writes the same context ProductGallery does, so picking a scent here
 * swaps the photograph over there.
 *
 * Nothing selected is not a neutral state: this is the one thing on the page
 * a shopper must do before "Add to cart" will work, so it says so outright
 * rather than just presenting a row of buttons and hoping the point lands.
 */
export function ProductVariantPicker({ label = "Fragrance" }: { label?: string }) {
  const { variants, selected, select } = useProductVariant();
  if (variants.length === 0) return null;

  return (
    <div
      className={cn(
        "rounded-xl border-2 p-4",
        selected
          ? "border-foreground/12"
          : "border-primary/40 bg-primary/5"
      )}
    >
      <p className="text-sm font-semibold">
        {selected ? (
          <>
            {label}: <span className="font-bold">{selected}</span>
          </>
        ) : (
          <span className="text-primary">
            Select a {label.toLowerCase()} — required before you can add this to
            your cart
          </span>
        )}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
        {variants.map((variant) => {
          const isSelected = variant.name === selected;
          return (
            <button
              key={variant.name}
              type="button"
              onClick={() => select(variant.name)}
              aria-pressed={isSelected}
              className={cn(
                "rounded-lg border-2 px-3 py-2.5 text-left text-sm font-semibold transition-colors",
                "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                isSelected
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-foreground/15 text-muted-foreground hover:border-foreground/35 hover:text-foreground"
              )}
            >
              {variant.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * A client's product video almost always means "here's a YouTube link", not
 * a file to host ourselves — rehosting someone else's upload is a step this
 * shop has no rights to take. Recognised as YouTube, it renders as YouTube's
 * own embed and thumbnail; anything else falls back to a plain `<video>` for
 * a file actually supplied to put in our own storage.
 */
function youTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1) || null;
    if (parsed.hostname.endsWith("youtube.com")) {
      if (parsed.pathname === "/watch") return parsed.searchParams.get("v");
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/")[2] ?? null;
      }
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * The same clip the gallery thumbnail plays, repeated further down the page
 * under its own "Product Videos" heading — Amazon shows a video in both
 * places rather than making the gallery the only way to find it, since a
 * shopper who has scrolled past the images is not going to scroll back up
 * for one. Its own play state, independent of the gallery's.
 */
export function ProductVideoSection({
  video,
  name,
}: {
  video?: string;
  name: string;
}) {
  const [playing, setPlaying] = React.useState(false);
  if (!video) return null;
  const ytId = youTubeId(video);

  return (
    <div className="border-foreground/12 border-t pt-6">
      <p className="font-display text-sm font-bold tracking-wide uppercase">
        Product Videos
      </p>
      <div className="border-foreground/10 bg-secondary/20 relative mt-3 aspect-video w-full max-w-md overflow-hidden rounded-xl border">
        {playing && ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
            title={`${name} — product video`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="absolute inset-0 size-full"
          />
        ) : playing && video ? (
          <video
            src={video}
            controls
            autoPlay
            playsInline
            className="absolute inset-0 size-full object-contain bg-black"
          />
        ) : (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the product video"
            className="group absolute inset-0"
          >
            {ytId ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : null}
            <span className="absolute inset-0 flex items-center justify-center bg-black/25 transition-colors group-hover:bg-black/35">
              <span className="bg-background/90 grid size-12 place-items-center rounded-full">
                <PlayIcon className="size-5 fill-current" aria-hidden />
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

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
 *
 * `variants`, when given, pairs each option with the photograph that shows
 * it — picking one swaps the main image the same way a thumbnail does,
 * because on a product that comes in six scents "which one is this" is the
 * first question a photograph has to answer.
 *
 * `video`, when given, adds one more thumbnail ahead of the photographs —
 * same corner Amazon puts theirs — that swaps the frame for a native
 * `<video>` instead of another `<Image>`. Only one product needs this today,
 * so there is no gallery of clips, just the one a supplier or client has
 * actually sent.
 */
export function ProductGallery({
  images,
  name,
  overlay,
  video,
}: {
  images: string[];
  name: string;
  overlay?: React.ReactNode;
  video?: string;
}) {
  const { variants, selected: selectedVariant, select: setSelectedVariant } =
    useProductVariant();
  const [active, setActive] = React.useState(0);
  const [showVideo, setShowVideo] = React.useState(false);
  const stripRef = React.useRef<HTMLUListElement>(null);
  const [overflow, setOverflow] = React.useState({ left: false, right: false });
  const ytId = video ? youTubeId(video) : null;

  // The picker itself now lives beside the buy box, on the right, where
  // Amazon puts it — but picking a photograph here still has to pick the
  // matching variant, and picking a variant there still has to swap this
  // photograph, so the sync stays here where both directions meet.
  React.useEffect(() => {
    if (!selectedVariant) return;
    const variant = variants.find((v) => v.name === selectedVariant);
    if (!variant) return;
    const index = images.indexOf(variant.image);
    if (index >= 0) setActive(index);
    setShowVideo(false);
  }, [selectedVariant, variants, images]);

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
          {showVideo && ytId ? (
            <iframe
              key={ytId}
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1`}
              title={`${name} — product video`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 size-full"
            />
          ) : showVideo && video ? (
            // autoPlay would fight the whole point of a click-to-watch
            // thumbnail — it starts silent and paused, same as landing on
            // this photograph does.
            <video
              key={video}
              src={video}
              poster={current}
              controls
              playsInline
              className="absolute inset-0 size-full object-contain bg-black"
            />
          ) : (
            <ProductImage
              key={current}
              src={current}
              alt={active === 0 ? name : `${name}, photograph ${active + 1}`}
              fill
              priority
              sizes="(min-width: 1024px) 714px, 96vw"
              className="object-cover"
            />
          )}
          {!showVideo && overlay}
        </div>

        {(images.length > 1 || video) && (
          <div className="relative mt-6">
            <ul
              ref={stripRef}
              onScroll={measure}
              className="flex gap-3 overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {video ? (
                <li className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowVideo(true)}
                    aria-label="Play the product video"
                    aria-current={showVideo}
                    className={cn(
                      "bg-secondary/30 relative block size-24 overflow-hidden rounded-xl border-2 transition-colors sm:size-28",
                      "focus-visible:ring-primary focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                      showVideo
                        ? "border-foreground"
                        : "border-transparent hover:border-foreground/25"
                    )}
                  >
                    {ytId ? (
                      // YouTube's own thumbnail CDN — a plain <img> rather
                      // than next/image, since it is one external host for
                      // one element and not worth widening the image
                      // optimiser's allow-list for.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt=""
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <Image
                        src={images[0]}
                        alt=""
                        fill
                        sizes="112px"
                        className="object-cover"
                      />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/35">
                      <span className="bg-background/90 grid size-9 place-items-center rounded-full">
                        <PlayIcon className="size-4 fill-current" aria-hidden />
                      </span>
                    </span>
                  </button>
                </li>
              ) : null}
              {images.map((image, index) => {
                const selected = index === active && !showVideo;

                return (
                  <li key={image} className="shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setActive(index);
                        setShowVideo(false);
                        // A thumbnail can point at the same photograph a
                        // variant button does — keep the two in step either
                        // way, rather than the label going stale.
                        const matched = variants?.find((v) => v.image === image);
                        setSelectedVariant(matched?.name ?? null);
                      }}
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
