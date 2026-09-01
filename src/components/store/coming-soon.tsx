import type * as React from "react";
import Link from "next/link";
import { ArrowRightIcon, MessageCircleIcon } from "lucide-react";

import { BrandHero } from "@/components/store/brand-hero";
import { Button } from "@/components/ui/button";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { getShopSettings } from "@/lib/shop/settings";

/**
 * The frame for a page the menu already points at but that has no content
 * yet. A menu entry leading to a blank screen reads as a broken shop, so each
 * of these says plainly what is coming and gives the visitor a way to ask —
 * an interest signal is worth more than a dead end.
 *
 * Replace the body with the real page as the copy arrives; the route and the
 * navigation entry do not need to change when that happens.
 */
export async function ComingSoon({
  eyebrow,
  title,
  blurb,
  enquiry,
  image,
  showContactActions = true,
  children,
}: {
  eyebrow: string;
  title: string;
  blurb: string;
  /** Pre-written WhatsApp message, so the reply lands with context. */
  enquiry: string;
  /**
   * Set on the ranges we carry but have not stocked yet: they get the same
   * banner a brand with products gets, so an empty range still reads as a
   * range rather than an apology.
   */
  image?: string;
  /**
   * Off where the page has its own call to action further down. The WhatsApp
   * and contact buttons sit directly under the blurb, so on a page with real
   * content below them they offer a way out before anyone has read it.
   */
  showContactActions?: boolean;
  /** Anything this particular page needs beneath the two calls to action. */
  children?: React.ReactNode;
}) {
  const shop = await getShopSettings();

  return (
    <div className="bg-muted/25 min-h-[70vh]">
      <div
        className={
          image
            ? "mx-auto max-w-[1400px] px-4 pt-4 pb-10 lg:px-8 lg:pt-5 lg:pb-14"
            : "mx-auto max-w-[820px] px-4 py-16 lg:px-8 lg:py-24"
        }
      >
        {image ? (
          <BrandHero
            brand={eyebrow}
            eyebrow="Range"
            image={image}
            blurb={blurb}
          />
        ) : (
          <>
            <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
              {eyebrow}
            </p>
            <h1 className="font-display mt-4 text-4xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl">
              {title}
            </h1>
            <p className="text-muted-foreground mt-6 max-w-xl text-base leading-7">
              {blurb}
            </p>
          </>
        )}

        {showContactActions ? (
          <div
            className={
              image ? "flex flex-wrap gap-3" : "mt-10 flex flex-wrap gap-3"
            }
          >
            {shop.whatsappEnabled ? (
              <WhatsAppLink message={enquiry}>
                <Button size="lg">
                  <MessageCircleIcon /> Ask us on WhatsApp
                </Button>
              </WhatsAppLink>
            ) : null}
            <Button asChild size="lg" variant="outline">
              <Link href="/contact">
                Send a message <ArrowRightIcon />
              </Link>
            </Button>
          </div>
        ) : null}

        {children}

        <p className="text-muted-foreground mt-12 text-sm">
          In the meantime,{" "}
          <Link href="/products" className="text-foreground underline underline-offset-4">
            browse everything in stock
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
