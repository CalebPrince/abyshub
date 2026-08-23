"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  MessageCircleIcon,
  TruckIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { FREE_DELIVERY_THRESHOLD, STORE_NAME } from "@/lib/config";
import { formatPrice } from "@/lib/money";

/**
 * Session-scoped, not visit-scoped: sessionStorage is cleared when the tab
 * closes, so a new tab or a new browser sees the welcome again while moving
 * around the shop in one tab does not.
 */
const SEEN_KEY = "abyshub.welcome.v1";

const points = [
  {
    icon: BadgeCheckIcon,
    title: "Genuine stock",
    body: "Tupperware through authorised channels, warranty intact.",
  },
  {
    icon: TruckIcon,
    title: "Free delivery",
    body: `On every basket over ${formatPrice(FREE_DELIVERY_THRESHOLD)}, nationwide.`,
  },
  {
    icon: CreditCardIcon,
    title: "Three ways to pay",
    body: "Card at checkout, WhatsApp, or ask us for a quote.",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    let seen = true;
    try {
      seen = window.sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {
      // Private mode or blocked storage — show it once and move on rather
      // than nagging on every navigation.
      seen = false;
    }
    if (seen) return;

    // A beat after paint, so it lands on a drawn page rather than a blank one.
    const show = () => setTimeout(() => setOpen(true), 700);

    // On the session's first load the splash owns the screen, so wait for it to
    // lift rather than animating in behind it. <SplashScreen /> flips the flag
    // to "seen" when it is done, skipped or shortened for reduced motion.
    const root = document.documentElement;
    if (root.dataset.splash !== "running") {
      const timer = show();
      return () => clearTimeout(timer);
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    const observer = new MutationObserver(() => {
      if (root.dataset.splash === "running") return;
      observer.disconnect();
      timer = show();
    });
    observer.observe(root, { attributeFilter: ["data-splash"] });

    return () => {
      observer.disconnect();
      clearTimeout(timer);
    };
  }, []);

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) {
      try {
        window.sessionStorage.setItem(SEEN_KEY, "1");
      } catch {
        // Nothing to do — it will simply show again next navigation.
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {/* Deliberately small on phones — a welcome should not eat the screen. */}
      <DialogContent className="max-w-[20rem] sm:max-w-md" showClose={false}>
        <div className="bg-foreground text-background relative px-5 py-5 sm:px-6 sm:py-7">
          {/* The shared close is styled for light surfaces and vanishes on this
              black header, so this panel brings its own. */}
          <DialogClose
            aria-label="Close"
            className="text-background/70 hover:text-background hover:bg-background/15 focus-visible:ring-background/60 absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <XIcon className="size-5" />
          </DialogClose>

          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            Welcome
          </p>
          <DialogTitle className="mt-2 max-w-[85%] text-xl leading-[1] sm:text-3xl sm:leading-[0.95]">
            Buy it once.
            <br />
            <span className="text-primary">Keep it</span> for years.
          </DialogTitle>
          <DialogDescription className="text-background/70 mt-2 line-clamp-2 text-xs sm:mt-3 sm:line-clamp-none sm:text-sm">
            {STORE_NAME} stocks genuine Tupperware and our own home range —
            airtight storage, prep tools and everyday kitchen goods built to
            outlast the trend cycle.
          </DialogDescription>
        </div>

        <ul className="divide-foreground/10 divide-y">
          {points.map((point) => (
            <li className="flex gap-3 px-5 py-2.5 sm:gap-3.5 sm:px-6 sm:py-3.5" key={point.title}>
              <point.icon className="text-primary mt-0.5 size-4 shrink-0 sm:size-5" />
              <div>
                <p className="text-sm font-semibold">{point.title}</p>
                {/* The supporting line is detail, not the message — phones get
                    the headline only. */}
                <p className="text-muted-foreground hidden text-sm sm:block">
                  {point.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex flex-col gap-2 px-5 pt-2 pb-5 sm:flex-row sm:gap-2.5 sm:px-6 sm:pb-6">
          <DialogClose asChild>
            <Button asChild className="h-9 flex-1 sm:h-10">
              <Link href="/products">
                Start shopping <ArrowRightIcon />
              </Link>
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button variant="outline" className="h-9 flex-1 sm:h-10">
              <MessageCircleIcon /> Keep browsing
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
