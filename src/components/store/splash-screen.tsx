"use client";

import * as React from "react";

/**
 * Total run time of the CSS choreography in globals.css — the last exit frame
 * lands at 1400ms + 500ms. Kept here only so the overlay can drop out of the
 * DOM afterwards; the animation itself is pure CSS and ends in
 * `visibility: hidden`, so the splash clears itself even if this never runs.
 */
const RUN_MS = 1900;

/** Reduced motion gets a plain hold-and-fade: 700ms delay + 400ms fade. */
const REDUCED_RUN_MS = 1100;

/** Matches the fast-forward fade the `is-skipping` class applies. */
const SKIP_MS = 260;

/**
 * The wordmark, split the way the header splits it: paper "ABYS", red "HUB",
 * then flattened to letters so each can be revealed on its own beat.
 */
const letters = [
  ...[..."ABYS"].map((char) => ({ char, accent: false })),
  ...[..."HUB"].map((char) => ({ char, accent: true })),
].map((letter, i) => ({ ...letter, delay: 620 + i * 38 }));

export function SplashScreen() {
  const [done, setDone] = React.useState(false);
  const [skipping, setSkipping] = React.useState(false);

  React.useEffect(() => {
    const root = document.documentElement;

    // The pre-paint script already decided this session had its splash: the
    // markup still rendered (the server cannot know), but CSS kept it hidden,
    // so it only needs collecting on the next tick.
    const seen = root.dataset.splash === "seen";
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let timer = window.setTimeout(
      () => setDone(true),
      seen ? 0 : reduced ? REDUCED_RUN_MS : RUN_MS
    );

    // Nobody should be held hostage by an intro — any click or key press
    // fast-forwards to the end.
    const skip = () => {
      setSkipping(true);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setDone(true), SKIP_MS);
    };
    if (!seen) {
      window.addEventListener("pointerdown", skip, { once: true });
      window.addEventListener("keydown", skip, { once: true });
    }

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("pointerdown", skip);
      window.removeEventListener("keydown", skip);
    };
  }, []);

  React.useEffect(() => {
    // Also releases the scroll lock the pre-paint script took out.
    if (done) document.documentElement.dataset.splash = "seen";
  }, [done]);

  if (done) return null;

  return (
    <div className={`splash${skipping ? " is-skipping" : ""}`} aria-hidden>
      <div className="splash-hatch hatch" />

      <div className="splash-stage">
        <div className="splash-mark">
          <span className="splash-bloom" />
          {/* Lid and base carry the same "AH" clipped to their own half, so the
              letterforms only resolve once the two meet. */}
          <span className="splash-half is-lid">
            <span className="splash-initials">AH</span>
          </span>
          <span className="splash-half is-base">
            <span className="splash-initials">AH</span>
          </span>
          <span className="splash-seal" />
        </div>

        <p className="splash-word">
          {letters.map((letter, i) => (
            <span
              className={letter.accent ? "splash-letter is-accent" : "splash-letter"}
              key={`${letter.char}-${i}`}
            >
              <span
                className="splash-letter-inner"
                style={{ animationDelay: `${letter.delay}ms` }}
              >
                {letter.char}
              </span>
            </span>
          ))}
        </p>

        <span className="splash-rule" />
        <p className="splash-tag">Genuine Tupperware &amp; home goods</p>
      </div>
    </div>
  );
}
