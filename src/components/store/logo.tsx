import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The wordmark.
 *
 * The real hand-lettered logo, not type pretending to be it. The file is a
 * single flat pink on transparency, so it sits correctly on white and on the
 * pink blocks alike without a second asset.
 *
 * `compact` drops back to the standalone "A" mark for tight spaces — the full
 * wordmark is wide, and squeezing script lettering into a 36px box turns it
 * into an illegible smudge.
 */
export function Logo({
  className,
  compact = false,
  tone = "brand",
}: {
  className?: string;
  compact?: boolean;
  /**
   * "paper" renders the wordmark white, for the pink surfaces it would
   * otherwise disappear into. Done with a filter rather than a second file:
   * brightness(0) flattens the artwork to black and invert(1) lifts it to
   * white, so the two never drift out of sync when the logo is redrawn.
   */
  tone?: "brand" | "paper";
}) {
  return (
    <Link
      href="/"
      aria-label="Abys Hub home"
      className={cn("group flex items-center", className)}
    >
      <Image
        src={compact ? "/brand/abys-hub-mark.png" : "/brand/abys-hub-logo.png"}
        alt="Abys Hub"
        width={compact ? 512 : 1400}
        height={compact ? 512 : 613}
        // The header is on every page and this is above the fold on all of
        // them, so it should not wait its turn behind the product images.
        priority
        className={cn(
          "w-auto object-contain transition-opacity group-hover:opacity-85",
          compact ? "h-9" : "h-8 sm:h-9",
          tone === "paper" && "brightness-0 invert"
        )}
      />
    </Link>
  );
}
