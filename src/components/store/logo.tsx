import Link from "next/link";

import { cn } from "@/lib/utils";

/**
 * The wordmark: black block, red "HUB". Kept as one component so the header,
 * footer and mobile menu never drift apart.
 */
export function Logo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <Link
      href="/"
      aria-label="Abys Hub home"
      className={cn("group flex items-center gap-2.5", className)}
    >
      <span
        aria-hidden
        className="bg-foreground text-background font-display grid size-9 place-items-center text-sm font-extrabold tracking-tighter"
      >
        AH
      </span>
      {!compact && (
        <span className="font-display text-xl leading-none font-extrabold tracking-tight uppercase">
          Abys<span className="text-primary">Hub</span>
        </span>
      )}
    </Link>
  );
}
