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
import { HeroSlider } from "@/components/store/hero-slider";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { getCatalogue, featuredFrom } from "@/lib/shop/catalogue";
import { getPageCopy } from "@/lib/shop/content";
import { OffersGrid } from "@/components/store/offers-grid";
import { PartnersSection } from "@/components/store/partners-section";
import { categoryImage, HERO_SLIDES, LIFESTYLE } from "@/lib/shop/imagery";
import { whatsappEnabled } from "@/lib/config";
import { getShopSettings } from "@/lib/shop/settings";
import { formatPrice } from "@/lib/money";

const orderRoutes = [
  {
    icon: CreditCardIcon,
    title: "Pay By Card or Mobile Money",
    body: "Pay with card or mobile money, MTN MoMo, Telecel Cash and AirtelTigo Money, plus bank transfer and USSD, all through Paystack.",
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
  const [{ products, categories }, copy, settings] = await Promise.all([
    getCatalogue(),
    getPageCopy("home"),
    getShopSettings(),
  ]);
  const featured = featuredFrom(products);

  // The admin copy panel predates the slider and has one set of hero keys, so
  // they stay pointed at the first slide rather than being silently ignored.
  const slides = HERO_SLIDES.map((slide, index) =>
    index === 0
      ? {
          ...slide,
          eyebrow: copy("hero_eyebrow", slide.eyebrow),
          body: copy("hero_body", slide.body),
          cta: copy("hero_cta", slide.cta),
        }
      : slide
  );

  const stats = [
    [
      String(products.filter((product) => product.inStock).length),
      "currently available in stock",
    ],
    [String(categories.length), "categories to explore"],
    [String(orderRoutes.length), "ways to order"],
  ] as const;

  return (
    <>
      {/* ── Hero: a slider, words left and one photograph right ── */}
      {/* A wash of the brand pink across the whole hero, well under the
          threshold where it reads as a coloured panel — the page should feel
          warmer here without anyone being able to say why. */}
      <section className="border-foreground/12 from-secondary/70 via-background to-background border-b bg-gradient-to-br">
        <HeroSlider slides={slides} stats={stats} />
      </section>

      {/* ── Shelves ── */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <Reveal className="mb-10 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
              01 The shelves
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
                02 Moving fast
              </p>
              <h2 className="font-display mt-3 text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
                What people keep
                <br className="hidden sm:block" /> coming back for
              </h2>
            </div>
            <Button asChild variant="outline">
              <Link href="/products">
                Browse all products <ArrowRightIcon />
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
              03 Ordering
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
              body: `Free over ${formatPrice(settings.freeDeliveryThreshold)}. Dispatch within one working day.`,
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
