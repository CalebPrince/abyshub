import Image from "next/image";
import Link from "next/link";
import {
  ArrowRightIcon,
  BadgeCheckIcon,
  CreditCardIcon,
  FileTextIcon,
  MessageCircleIcon,
  TruckIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { Reveal } from "@/components/store/reveal";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";
import { getPageCopy } from "@/lib/shop/content";
import { OffersGrid } from "@/components/store/offers-grid";
import { PartnersSection } from "@/components/store/partners-section";
import { categoryImage, HERO_ALBUM, LIFESTYLE } from "@/lib/shop/imagery";
import { FREE_DELIVERY_THRESHOLD, whatsappEnabled } from "@/lib/config";
import { formatPrice } from "@/lib/money";

const orderRoutes = [
  {
    icon: CreditCardIcon,
    title: "Pay by card",
    body: "Checkout online and pay with card, bank transfer or USSD through Paystack.",
    href: "/checkout",
    cta: "Go to checkout",
  },
  {
    icon: MessageCircleIcon,
    title: "Order on WhatsApp",
    body: "Fill your basket, then send it to us as a message. We confirm and arrange delivery.",
    href: "/cart",
    cta: "Build a basket",
  },
  {
    icon: FileTextIcon,
    title: "Request a quote",
    body: "Buying in bulk or for an event? Tell us what you need and we will price it.",
    href: "/enquiry",
    cta: "Send an enquiry",
  },
];

export default async function HomePage() {
  const [{ products, categories }, copy] = await Promise.all([
    getCatalogue(),
    getPageCopy("home"),
  ]);
  const featured = featuredFrom(products);

  return (
    <>
      {/* ── Hero: split black/paper, oversized type, offset product ── */}
      {/* A wash of the brand pink across the whole hero, well under the
          threshold where it reads as a coloured panel — the page should feel
          warmer here without anyone being able to say why. */}
      <section className="border-foreground/12 from-secondary/70 border-b bg-gradient-to-br via-white to-white">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-12">
          {/* Words on the left, an album of six on the right. One picture
              could only show one half of what the shop sells; six show both
              partners before a word is read. */}
          <div className="flex flex-col justify-center px-4 py-10 lg:col-span-5 lg:py-14 lg:pl-8 xl:pl-12">
            <Reveal className="max-w-xl" y={16}>
            <p className="text-primary mb-6 text-[11px] font-semibold tracking-[0.24em] uppercase">
              {copy("hero_eyebrow", "Genuine Tupperware · and more")}
            </p>

            <h1 className="font-display text-[clamp(2.25rem,4.4vw,3.75rem)] leading-[0.95] font-extrabold tracking-[-0.03em] uppercase">
              Buy it once.
              <br />
              <span className="text-primary">Keep it</span> for
              <br />
              years.
            </h1>

            <p className="text-muted-foreground mt-5 max-w-md text-base">
              {copy(
                "hero_body",
                "Airtight storage, prep tools and home goods that survive daily use in a real kitchen — not the kind that cracks by the second harmattan."
              )}
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  {copy("hero_cta", "Shop everything")} <ArrowRightIcon />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-foreground/25"
              >
                <Link href="/products?brand=Tupperware">Tupperware only</Link>
              </Button>
            </div>

            <dl className="border-foreground/12 mt-8 grid max-w-lg grid-cols-3 gap-6 border-t pt-6">
              {[
                [String(products.filter((product) => product.inStock).length), "products in stock"],
                [String(categories.length), "shelves to browse"],
                [String(orderRoutes.length), "ways to order"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-2xl font-extrabold">
                    {value}
                  </dt>
                  <dd className="text-muted-foreground mt-1 text-xs tracking-wide uppercase">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
            </Reveal>
          </div>

          {/* Three columns, staggered against each other and alternating
              tall and square, so it reads as a laid-out album rather than a
              grid of thumbnails. */}
          <div className="grid grid-cols-2 gap-3 px-4 pb-10 sm:grid-cols-3 lg:col-span-7 lg:gap-4 lg:py-14 lg:pr-8 lg:pl-4 xl:pr-12">
            {[0, 1, 2].map((column) => (
              <Reveal
                key={column}
                delay={120 + column * 100}
                y={20}
                className={`flex flex-col gap-3 lg:gap-4 ${
                  column === 1 ? "sm:mt-8" : column === 2 ? "sm:mt-4" : ""
                } ${column === 2 ? "hidden sm:flex" : ""}`}
              >
                {HERO_ALBUM.slice(column * 2, column * 2 + 2).map((frame, i) => (
                  <div
                    key={frame.src}
                    className={`bg-secondary relative overflow-hidden rounded-2xl ${
                      frame.tall ? "aspect-3/4" : "aspect-square"
                    }`}
                  >
                    <Image
                      src={frame.src}
                      alt={frame.alt}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 640px) 30vw, 45vw"
                      // Only the first frame is above the fold on every screen.
                      priority={column === 0 && i === 0}
                      className={`object-cover ${frame.focus}`}
                    />
                  </div>
                ))}
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Shelves ── */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
              01 — The shelves
            </p>
            <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
              Find it by where
              <br className="hidden sm:block" /> it lives
            </h2>
          </div>
          <p className="text-muted-foreground max-w-sm text-sm">
            Five shelves, no endless catalogue. If it is on the site, it is
            something we would keep in our own kitchen.
          </p>
        </Reveal>

        <div className="grid gap-px lg:grid-cols-5">
          {categories.map((category, index) => (
            <Reveal key={category.slug} delay={index * 70} className="h-full">
              <Link
                href={`/products?category=${category.slug}`}
                className="group border-foreground/12 hover:bg-primary hover:text-primary-foreground relative flex h-full min-h-56 flex-col justify-between rounded-xl border p-6 transition-colors"
              >
                <div className="relative mb-5 aspect-3/2 overflow-hidden rounded-lg">
                  <Image
                    src={categoryImage(category.slug)}
                    alt=""
                    fill
                    sizes="(min-width: 1024px) 20vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                  />
                </div>
                <span className="text-muted-foreground group-hover:text-background/50 font-display text-3xl font-extrabold">
                  0{index + 1}
                </span>
                <div>
                  <h3 className="font-display text-xl font-extrabold tracking-tight uppercase">
                    {category.name}
                  </h3>
                  <p className="text-muted-foreground group-hover:text-background/70 mt-2 text-sm">
                    {category.description}
                  </p>
                  <span className="text-primary group-hover:text-primary-foreground mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
                    Browse <ArrowRightIcon className="size-3.5" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── Lifestyle band ── */}
      <section className="border-foreground/12 relative border-y">
        <div className="relative aspect-16/9 max-h-[26rem] w-full sm:aspect-21/9">
          <Image
            src={LIFESTYLE.kitchen}
            alt="A kitchen counter of sealed storage canisters, being filled"
            fill
            sizes="100vw"
            className="object-cover"
          />
          {/* Weighted to the left, where the words sit, so the picture is not
              flattened under a full-width scrim. */}
          <div className="from-foreground/80 via-foreground/45 absolute inset-0 bg-gradient-to-r to-transparent" />

          <div className="absolute inset-0 flex items-center">
            <div className="mx-auto w-full max-w-[1400px] px-4 lg:px-8">
              <Reveal className="max-w-md">
                <p className="text-background/80 text-[11px] font-semibold tracking-[0.24em] uppercase">
                  Built for a real kitchen
                </p>
                <h2 className="font-display text-background mt-3 text-3xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-4xl lg:text-5xl">
                  Sealed today.
                  <br />
                  Still sealed
                  <br />
                  next year.
                </h2>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      <OffersGrid products={products} />

      {/* ── Featured ── */}
      <section className="border-foreground/12 border-y">
        <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
                02 — Moving fast
              </p>
              <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
                What people keep
                <br className="hidden sm:block" /> coming back for
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">
                See all 14 <ArrowRightIcon />
              </Link>
            </Button>
          </Reveal>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((product, index) => (
              <Reveal key={product.id} delay={Math.min(index * 60, 300)} className="h-full">
                <ProductCard product={product} className="h-full" />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Three ways to order ── */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <Reveal>
            <p className="text-primary-foreground/75 text-[11px] font-semibold tracking-[0.24em] uppercase">
              03 — Ordering
            </p>
            <h2 className="font-display mt-3 max-w-2xl text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
              Order the way that suits you
            </h2>
            <p className="text-background/65 mt-4 max-w-lg">
              Not everyone wants to type card details into a website. All three
              routes reach the same person on our side.
            </p>
          </Reveal>

          <div className="mt-12 grid gap-px sm:grid-cols-3">
            {orderRoutes.map((route, index) => (
              <Reveal key={route.title} delay={index * 90} className="h-full">
                <div className="border-background/20 flex h-full flex-col gap-4 rounded-xl border p-7">
                  <route.icon className="text-primary-foreground size-7" />
                  <h3 className="font-display text-xl font-extrabold tracking-tight uppercase">
                    {route.title}
                  </h3>
                  <p className="text-background/65 flex-1 text-sm">{route.body}</p>
                  <Button
                    asChild
                    variant="outline"
                    className="border-background/35 text-background hover:bg-background hover:text-foreground w-fit"
                  >
                    <Link href={route.href}>{route.cta}</Link>
                  </Button>
                </div>
              </Reveal>
            ))}
          </div>

          {whatsappEnabled && (
            <Reveal className="border-background/20 mt-10 flex flex-wrap items-center justify-between gap-4 rounded-xl border p-6">
              <p className="text-background/80 text-sm">
                Prefer to just ask a question first?
              </p>
              <WhatsAppLink message="Hello Abys Hub, I have a question about your products.">
                <Button variant="default">
                  <MessageCircleIcon /> Chat on WhatsApp
                </Button>
              </WhatsAppLink>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── Promise strip ── */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8">
        <div className="grid gap-px sm:grid-cols-3">
          {[
            {
              icon: BadgeCheckIcon,
              title: "Genuine stock",
              body: "Tupperware sourced through authorised channels, with the warranty intact.",
            },
            {
              icon: TruckIcon,
              title: "Nationwide delivery",
              body: `Free over ${formatPrice(FREE_DELIVERY_THRESHOLD)}. Dispatch within one working day.`,
            },
            {
              icon: MessageCircleIcon,
              title: "A person, not a bot",
              body: "Ask before you buy. We will tell you honestly if it is not the right size.",
            },
          ].map((item, index) => (
            <Reveal key={item.title} delay={index * 90} className="h-full">
              <div className="border-foreground/12 flex h-full flex-col gap-3 rounded-xl border p-7">
                <item.icon className="text-primary size-6" />
                <h3 className="font-display text-lg font-extrabold tracking-tight uppercase">
                  {item.title}
                </h3>
                <p className="text-muted-foreground text-sm">{item.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <PartnersSection />
    </>
  );
}
