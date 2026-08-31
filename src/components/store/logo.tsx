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
 * `compact` renders the same wordmark file at a small fixed height — there is
 * no separate square mark for tight spaces, so it letterboxes rather than
 * cropping.
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
        src="/brand/abyshub.png"
        alt="Abys Hub"
        width={3508}
        height={2481}
        // The header is on every page and this is above the fold on all of
        // them, so it should not wait its turn behind the product images.
        priority
        className={cn(
          "w-auto object-contain transition-opacity group-hover:opacity-85",
          compact ? "h-10" : "h-11 sm:h-12 lg:h-14",
          tone === "paper" && "brightness-0 invert"
        )}
      />
    </Link>
  );
}
