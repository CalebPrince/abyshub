"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRightIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Reveal } from "@/components/store/reveal";

type Segment = { readonly text: string; readonly accent?: boolean };

type Slide = {
  readonly src: string;
  readonly alt: string;
  /** Tailwind `object-position`, so a right-weighted shot is not cropped to bare wall. */
  readonly focus: string;
  readonly eyebrow: string;
  /** One inner array per rendered line; `accent` sets that run in the brand pink. */
  readonly headline: readonly (readonly Segment[])[];
  readonly body: string;
  readonly cta: string;
  readonly href: string;
};

const INTERVAL_MS = 6000;

/**
 * The whole hero: words on the left, one photograph at a time on the right,
 * both halves crossfading together.
 *
 * Text and picture are one component rather than two because they share an
 * index, and two components sharing an index through a parent is how you get a
 * hero whose headline is a beat behind its photograph. A slide is a single
 * argument — eyebrow, headline, paragraph, button, image — and it arrives and
 * leaves whole.
 *
 * The blend on the picture is the other half of the point. A photograph in a
 * rounded box would sit *on* the hero; these scrims dissolve its edges into
 * `--background`, the colour the section's own gradient has reached by the
 * time it gets to that column, so the picture ends without there being an edge
 * where it ended. Everything is painted in theme tokens, so it holds on the
 * dark ground too.
 */
export function HeroSlider({
  slides,
  stats,
}: {
  slides: readonly Slide[];
  stats: readonly (readonly [string, string])[];
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [animate, setAnimate] = useState(true);

  // Reduced motion switches off the crossfade *and* the auto-advance. A hero
  // that rewrites itself unprompted is the precise thing that setting is
  // asking us not to do, so the arrows become the only way it moves.
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setAnimate(!query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  // `index` is a dependency so a manual click restarts the clock — otherwise
  // clicking next a moment before the timer fires gives you two slides in a
  // blink and it reads as a glitch.
  useEffect(() => {
    if (!animate || paused || slides.length < 2) return;
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % slides.length),
      INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [animate, paused, slides.length, index]);

  const step = (delta: number) =>
    setIndex((current) => (current + delta + slides.length) % slides.length);

  const fade = animate ? "transition-opacity duration-700 ease-in-out" : "";

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label="What Abys Hub stocks"
      className="mx-auto grid max-w-[1400px] lg:grid-cols-12"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="flex flex-col justify-center px-4 py-10 lg:col-span-5 lg:py-14 lg:pl-8 xl:pl-12">
        <Reveal className="max-w-xl" y={16}>
          {/* Every slide's words occupy the same grid cell, so the block is as
              tall as the longest of them and nothing below it moves when the
              copy changes. Stacking these would make the stats jump twice a
              minute. */}
          <div className="grid">
            {slides.map((slide, position) => {
              const active = position === index;
              // One `h1` in the document, and it is the shop's primary claim.
              // Later slides carry the same type at the same size without
              // pretending to be a second top-level heading.
              const Headline = position === 0 ? "h1" : "p";

              return (
                <div
                  key={slide.src}
                  aria-hidden={!active}
                  className={`col-start-1 row-start-1 ${fade}`}
                  style={{
                    opacity: active ? 1 : 0,
                    // A faded-out slide still occupies the cell, so without
                    // this its button stays clickable under the visible one.
                    pointerEvents: active ? "auto" : "none",
                  }}
                >
                  <p className="text-primary mb-6 text-[11px] font-semibold tracking-[0.24em] uppercase">
                    {slide.eyebrow}
                  </p>

                  <Headline className="font-display text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
                    {slide.headline.map((line, lineIndex) => (
                      <span key={lineIndex}>
                        {lineIndex > 0 && <br />}
                        {line.map((segment, segmentIndex) => (
                          <span
                            key={segmentIndex}
                            className={segment.accent ? "text-primary" : undefined}
                          >
                            {segment.text}
                          </span>
                        ))}
                      </span>
                    ))}
                  </Headline>

                  <p className="text-muted-foreground mt-5 max-w-md text-base">
                    {slide.body}
                  </p>

                  <div className="mt-7">
                    <Button asChild size="lg" tabIndex={active ? undefined : -1}>
                      <Link href={slide.href}>
                        {slide.cta} <ArrowRightIcon />
                      </Link>
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          <dl className="border-foreground/12 mt-8 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
            {stats.map(([value, label]) => (
              <div key={label}>
                <dt className="font-display text-2xl font-extrabold">{value}</dt>
                <dd className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
                  {label}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      {/* Full-bleed to the container edge, no padding and no frame: the picture
          is dissolved into the section by the scrims below, so any gutter here
          would put back the edge they remove. */}
      <div className="relative min-h-[22rem] overflow-hidden sm:min-h-[26rem] lg:col-span-7 lg:min-h-[34rem]">
        {slides.map((slide, position) => (
          <div
            key={slide.src}
            aria-hidden={position !== index}
            className={`absolute inset-0 ${
              animate ? "transition-opacity duration-1000 ease-in-out" : ""
            }`}
            style={{ opacity: position === index ? 1 : 0 }}
          >
            <Image
              src={slide.src}
              alt={slide.alt}
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              // Only the first frame is above the fold on load; the rest are
              // swapped in later and can wait their turn.
              priority={position === 0}
              className={`object-cover ${slide.focus}`}
            />
          </div>
        ))}

        {/* Which edge blends is a layout question, not a taste one: on a wide
            screen the headline is to the LEFT of the picture, so the picture
            dissolves leftward into it. Stacked on a phone the headline is
            ABOVE, so the left fade would be eating two fifths of a 390px
            photograph to blend into nothing — it is dropped there, and the top
            fade does the work instead. */}
        <div className="from-background via-background/55 pointer-events-none absolute inset-y-0 left-0 hidden w-2/5 bg-gradient-to-r to-transparent lg:block" />
        <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t to-transparent" />
        <div className="from-background lg:from-background/70 pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b to-transparent lg:h-16" />
        <div className="from-secondary/55 pointer-events-none absolute inset-0 bg-gradient-to-br via-transparent to-transparent" />

        {/* Dots and arrows both sit left. The bottom-right corner of the
            viewport belongs to the chat launcher, which is fixed and floats
            over this section — anything parked there is either covered by it
            or crowding it. */}
        {slides.length > 1 && (
          <div className="absolute inset-x-4 bottom-5 flex items-center gap-5 lg:inset-x-8">
            <div className="flex items-center gap-2">
              {slides.map((slide, position) => (
                <button
                  key={slide.src}
                  type="button"
                  onClick={() => setIndex(position)}
                  aria-label={`Show slide ${position + 1} of ${slides.length}`}
                  aria-current={position === index}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    position === index
                      ? "bg-primary w-8"
                      : "bg-foreground/25 hover:bg-foreground/45 w-3"
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {[
                { label: "Previous slide", delta: -1, Icon: ChevronLeftIcon },
                { label: "Next slide", delta: 1, Icon: ChevronRightIcon },
              ].map(({ label, delta, Icon }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => step(delta)}
                  aria-label={label}
                  className="border-foreground/15 bg-background/70 text-foreground hover:bg-background focus-visible:ring-ring grid size-9 place-items-center rounded-full border backdrop-blur-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
                >
                  <Icon className="size-4" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
