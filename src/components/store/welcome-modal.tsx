"use client";

import * as React from "react";
import {
  BadgeCheckIcon,
  CheckCircle2Icon,
  CreditCardIcon,
  SendIcon,
  TruckIcon,
  XIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { subscribeToOffers } from "@/lib/actions/subscribe";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { useCart } from "@/components/store/cart-provider";
import { STORE_NAME } from "@/lib/config";
import { formatPrice } from "@/lib/money";

/**
 * Session-scoped, not visit-scoped: sessionStorage is cleared when the tab
 * closes, so a new tab or a new browser sees the welcome again while moving
 * around the shop in one tab does not.
 */
const SEEN_KEY = "abyshub.welcome.v1";

/** Built per render: the threshold is a shop setting, not a constant. */
function buildPoints(freeDeliveryThreshold: number) {
  return [
    {
      icon: BadgeCheckIcon,
      title: "Offers first",
      body: "Discounts reach the list before they reach the shop.",
    },
    {
      icon: TruckIcon,
      title: "Free delivery",
      body: `Still free on every basket over ${formatPrice(freeDeliveryThreshold)}, nationwide.`,
    },
    {
      icon: CreditCardIcon,
      title: "Genuine stock",
      body: "Tupperware through authorised channels, warranty intact.",
    },
  ];
}

export function WelcomeModal() {
  const { rates } = useCart();
  const points = buildPoints(rates.freeDeliveryThreshold);
  const [open, setOpen] = React.useState(false);
  const [state, formAction, pending] = React.useActionState(subscribeToOffers, {
    status: "idle" as const,
    message: null,
  });

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
        <div className="bg-primary text-primary-foreground relative px-5 py-5 sm:px-6 sm:py-7">
          {/* The shared close is styled for light surfaces and vanishes on this
              black header, so this panel brings its own. */}
          <DialogClose
            aria-label="Close"
            className="text-background/70 hover:text-background hover:bg-background/15 focus-visible:ring-background/60 absolute top-3 right-3 grid size-9 cursor-pointer place-items-center rounded-full transition-colors focus-visible:ring-[3px] focus-visible:outline-none"
          >
            <XIcon className="size-5" />
          </DialogClose>

          <p className="text-primary-foreground/75 text-[11px] font-semibold tracking-[0.24em] uppercase">
            Discount offers
          </p>
          <DialogTitle className="mt-2 max-w-[85%] text-xl leading-[1] sm:text-3xl sm:leading-[0.95]">
            Get the deals
            <br />
            <span className="text-foreground">before</span> everyone else.
          </DialogTitle>
          <DialogDescription className="text-background/70 mt-2 line-clamp-2 text-xs sm:mt-3 sm:line-clamp-none sm:text-sm">
            Leave your email and {STORE_NAME} will send you our discount
            offers as they land — monthly deals and price drops on genuine
            Tupperware and our own home range.
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

        {state.status === "sent" ? (
          <div className="px-5 pt-4 pb-5 text-center sm:px-6 sm:pb-6">
            <CheckCircle2Icon className="mx-auto size-8 text-emerald-600" />
            <p className="mt-2 text-sm font-semibold">{state.message}</p>
            <DialogClose asChild>
              <Button variant="outline" className="mt-4 h-9 w-full sm:h-10">
                Keep browsing
              </Button>
            </DialogClose>
          </div>
        ) : (
          <form action={formAction} className="px-5 pt-3 pb-5 sm:px-6 sm:pb-6">
            <input type="hidden" name="source" value="welcome_modal" />
            <Label htmlFor="offers-email" className="sr-only">
              Email address
            </Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:gap-2.5">
              <Input
                id="offers-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="h-9 flex-1 sm:h-10"
              />
              <Button type="submit" disabled={pending} className="h-9 sm:h-10">
                <SendIcon /> {pending ? "Sending…" : "Send me offers"}
              </Button>
            </div>

            {state.status === "error" && state.message ? (
              <p role="alert" className="text-primary mt-2 text-xs">
                {state.message}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-muted-foreground text-[11px]">
                Offers only. Unsubscribe whenever you like.
              </p>
              <DialogClose className="text-muted-foreground hover:text-foreground shrink-0 cursor-pointer text-[11px] underline underline-offset-4">
                No thanks
              </DialogClose>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
