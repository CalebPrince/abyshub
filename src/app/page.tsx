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
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import { categories, getFeaturedProducts, products } from "@/lib/products";
import { whatsappEnabled } from "@/lib/config";
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

export default function HomePage() {
  const featured = getFeaturedProducts();
  const hero = products.find((p) => p.slug === "modular-dry-storage-set-8-piece")!;
  const secondary = products.find((p) => p.slug === "speedy-chopper")!;

  return (
    <>
      {/* ── Hero: split black/paper, oversized type, offset product ── */}
      <section className="border-foreground/12 border-b">
        <div className="mx-auto grid max-w-[1400px] lg:grid-cols-12">
          <div className="bg-foreground text-background flex flex-col justify-center px-4 py-16 lg:col-span-7 lg:px-12 lg:py-24">
            <p className="text-primary mb-6 text-[11px] font-semibold tracking-[0.24em] uppercase">
              Genuine Tupperware · and more
            </p>

            <h1 className="font-display text-[clamp(2.75rem,7vw,5.5rem)] leading-[0.92] font-extrabold tracking-[-0.03em] uppercase">
              Buy it once.
              <br />
              <span className="text-primary">Keep it</span> for
              <br />
              years.
            </h1>

            <p className="text-background/70 mt-7 max-w-md text-lg">
              Airtight storage, prep tools and home goods that survive daily use
              in a real kitchen — not the kind that cracks by the second
              harmattan.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/products">
                  Shop everything <ArrowRightIcon />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-background/35 text-background hover:bg-background hover:text-foreground"
              >
                <Link href="/products?brand=Tupperware">Tupperware only</Link>
              </Button>
            </div>

            <dl className="border-background/15 mt-12 grid max-w-lg grid-cols-3 gap-6 border-t pt-8">
              {[
                ["14", "products in stock"],
                ["5", "shelves to browse"],
                ["3", "ways to order"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="font-display text-3xl font-extrabold">
                    {value}
                  </dt>
                  <dd className="text-background/55 mt-1 text-xs tracking-wide uppercase">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Two stacked product plates rather than one stock photo. */}
          <div className="relative grid lg:col-span-5">
            <Link
              href={`/products/${hero.slug}`}
              className="group border-foreground/12 relative block aspect-square border-b lg:aspect-auto"
            >
              <Image
                src={hero.image}
                alt={hero.name}
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute bottom-0 left-0 max-w-[86%] bg-white/95 p-4">
                <p className="text-primary text-[10px] font-semibold tracking-[0.16em] uppercase">
                  Best seller
                </p>
                <p className="font-display mt-1 leading-tight font-bold text-[#111]">
                  {hero.name}
                </p>
                <p className="font-display mt-1 font-extrabold text-[#111] tabular-nums">
                  {formatPrice(hero.price)}
                </p>
              </div>
            </Link>

            <Link
              href={`/products/${secondary.slug}`}
              className="group relative hidden aspect-[2/1] lg:block"
            >
              <Image
                src={secondary.image}
                alt={secondary.name}
                fill
                sizes="42vw"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
              />
              <div className="absolute right-0 bottom-0 max-w-[86%] bg-[#111] p-4 text-white">
                <p className="font-display leading-tight font-bold">
                  {secondary.name}
                </p>
                <p className="font-display mt-1 font-extrabold tabular-nums">
                  {formatPrice(secondary.price)}
                </p>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Shelves ── */}
      <section className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
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
        </div>

        <div className="grid gap-px lg:grid-cols-5">
          {categories.map((category, index) => (
            <Link
              key={category.slug}
              href={`/products?category=${category.slug}`}
              className="group border-foreground/12 hover:bg-foreground hover:text-background relative flex min-h-56 flex-col justify-between border p-6 transition-colors"
            >
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
                <span className="text-primary mt-4 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase">
                  Browse <ArrowRightIcon className="size-3.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* ── Featured ── */}
      <section className="border-foreground/12 border-y">
        <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-4">
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
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Three ways to order ── */}
      <section className="bg-foreground text-background">
        <div className="mx-auto max-w-[1400px] px-4 py-16 lg:px-8 lg:py-24">
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            03 — Ordering
          </p>
          <h2 className="font-display mt-3 max-w-2xl text-4xl font-extrabold tracking-tight uppercase sm:text-5xl">
            Order the way that suits you
          </h2>
          <p className="text-background/65 mt-4 max-w-lg">
            Not everyone wants to type card details into a website. All three
            routes reach the same person on our side.
          </p>

          <div className="mt-12 grid gap-px sm:grid-cols-3">
            {orderRoutes.map((route) => (
              <div
                key={route.title}
                className="border-background/20 flex flex-col gap-4 border p-7"
              >
                <route.icon className="text-primary size-7" />
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
            ))}
          </div>

          {whatsappEnabled && (
            <div className="border-background/20 mt-10 flex flex-wrap items-center justify-between gap-4 border p-6">
              <p className="text-background/80 text-sm">
                Prefer to just ask a question first?
              </p>
              <WhatsAppLink message="Hello Abys Hub, I have a question about your products.">
                <Button variant="default">
                  <MessageCircleIcon /> Chat on WhatsApp
                </Button>
              </WhatsAppLink>
            </div>
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
              body: `Free over ${formatPrice(5000000)}. Dispatch within one working day.`,
            },
            {
              icon: MessageCircleIcon,
              title: "A person, not a bot",
              body: "Ask before you buy. We will tell you honestly if it is not the right size.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="border-foreground/12 flex flex-col gap-3 border p-7"
            >
              <item.icon className="text-primary size-6" />
              <h3 className="font-display text-lg font-extrabold tracking-tight uppercase">
                {item.title}
              </h3>
              <p className="text-muted-foreground text-sm">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
