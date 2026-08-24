"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  /** Stagger, in ms — pass `index * 60` from a `.map()` for a cascading grid. */
  delay?: number;
  /** How far the content lifts in from, in px. */
  y?: number;
  /** Re-hide when scrolled past, instead of revealing once and staying put. */
  repeat?: boolean;
};

/**
 * Fades and lifts its children in once they cross into the viewport. Nothing
 * distinguishes "on load" from "on scroll" here — content already in view
 * when the page paints (the hero) reveals within a frame of mount, and
 * everything below the fold reveals as it's scrolled to. Same mechanism.
 *
 * Starts hidden on the server, which means it stays hidden forever without
 * JavaScript to run the observer — the `<noscript>` rule in the root layout
 * is what un-hides `[data-reveal]` for that case.
 */
export function Reveal({
  children,
  className = "",
  delay = 0,
  y = 24,
  repeat = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          if (!repeat) observer.unobserve(node);
        } else if (repeat) {
          setVisible(false);
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [repeat]);

  return (
    <div
      ref={ref}
      data-reveal
      className={`transition-[opacity,transform] duration-700 ease-out ${className}`}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : `translateY(${y}px)`,
        transitionDelay: visible ? `${delay}ms` : "0ms",
      }}
    >
      {children}
    </div>
  );
}
