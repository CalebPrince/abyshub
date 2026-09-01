import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheckIcon,
  ChevronRightIcon,
  MessageCircleIcon,
  StarIcon,
  TruckIcon,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/store/product-card";
import { ProductDescriptionTabs } from "@/components/store/product-description-tabs";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductPurchasePanel } from "@/components/store/product-purchase-panel";
import { WhatsAppLink } from "@/components/store/whatsapp-link";
import {
  getCatalogue,
  getProducts,
  categoryFrom,
  relatedFrom,
} from "@/lib/shop/catalogue";
import { categoryImage } from "@/lib/shop/imagery";
import { formatPrice } from "@/lib/money";
import { getShopSettings } from "@/lib/shop/settings";
import { buildWhatsAppProductEnquiry } from "@/lib/whatsapp-message";

export async function generateStaticParams() {
  // Built from the live catalogue, so a product added in the admin gets a page.
  return (await getProducts()).map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getProducts()).find((item) => item.slug === slug);

  if (!product) return { title: "Product not found" };

  return {
    title: `${product.name} — ${product.brand}`,
    description: product.tagline,
    openGraph: {
      title: product.name,
      description: product.tagline,
      images: [{ url: product.image }],
    },
  };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const [{ products, categories }, settings] = await Promise.all([
    getCatalogue(),
    getShopSettings(),
  ]);
  const product = products.find((item) => item.slug === slug);

  if (!product) notFound();

  const category = categoryFrom(categories, product.category);
  const related = relatedFrom(products, product);
  const gallery = [...new Set([product.image, ...(product.images ?? [])])].filter(
    Boolean
  );
  const onSale =
    product.compareAtPrice !== undefined &&
    product.compareAtPrice > product.price;

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 lg:px-8">
      <nav aria-label="Breadcrumb" className="py-4">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-1.5 text-xs tracking-wide uppercase">
          <li>
            <Link href="/" className="hover:text-foreground">
              Home
            </Link>
          </li>
          <ChevronRightIcon className="size-3" aria-hidden />
          <li>
            <Link href="/products" className="hover:text-foreground">
              Shop
            </Link>
          </li>
          {category && (
            <>
              <ChevronRightIcon className="size-3" aria-hidden />
              <li>
                <Link
                  href={`/products?category=${category.slug}`}
                  className="hover:text-foreground"
                >
                  {category.name}
                </Link>
              </li>
            </>
          )}
          <ChevronRightIcon className="size-3" aria-hidden />
          <li className="text-foreground font-semibold">{product.name}</li>
        </ol>
      </nav>

      <div className="border-foreground/12 grid overflow-hidden rounded-2xl border lg:grid-cols-2">
        <div className="border-foreground/12 border-b lg:sticky lg:top-32 lg:self-start lg:border-b-0">
          <ProductGallery
            images={gallery}
            name={product.name}
            overlay={
              <>
                <span className="bg-primary text-primary-foreground absolute top-3 left-3 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
                  {product.brand}
                </span>
                {onSale && (
                  <span className="bg-primary text-primary-foreground absolute top-3 right-3 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase">
                    Save {formatPrice(product.compareAtPrice! - product.price)}
                  </span>
                )}
              </>
            }
          />
        </div>

        <div className="border-foreground/12 space-y-7 p-6 lg:border-l lg:p-10">
          <div className="space-y-4">
            {category && (
              <Link
                href={`/products?category=${category.slug}`}
                className="text-primary text-[11px] font-semibold tracking-[0.2em] uppercase hover:underline"
              >
                {category.name}
              </Link>
            )}

            {/* Sits between the shelf and the name: the category is a link
                in the shop's own voice, this is the maker's. */}
            {product.productLine ? (
              <p className="border-foreground/25 text-foreground/75 inline-flex border-b pb-1.5 text-[11px] font-semibold tracking-[0.2em] uppercase">
                {product.productLine}
              </p>
            ) : null}

            <h1 className="font-display text-4xl leading-[0.98] font-extrabold tracking-tight uppercase text-balance sm:text-5xl">
              {product.name}
            </h1>

            <p className="text-muted-foreground text-lg text-pretty">
              {product.tagline}
            </p>

            <div className="flex items-center gap-2 text-sm">
              <div className="flex items-center gap-0.5" aria-hidden>
                {Array.from({ length: 5 }).map((_, index) => (
                  <StarIcon
                    key={index}
                    className={
                      index < Math.round(product.rating)
                        ? "fill-primary text-primary size-4"
                        : "text-muted-foreground/35 size-4"
                    }
                  />
                ))}
              </div>
              <span className="font-semibold">{product.rating}</span>
              <span className="text-muted-foreground">
                from {product.reviewCount} buyers
              </span>
            </div>
          </div>

          <div className="border-foreground/12 border-t pt-6">
            <div className="bg-primary mb-3 h-1 w-12 rounded-full" aria-hidden />
            <div className="flex items-baseline gap-3">
              <span className="font-display text-4xl font-extrabold tabular-nums">
                {formatPrice(product.price)}
              </span>
              {onSale && (
                <span className="text-muted-foreground text-lg line-through tabular-nums">
                  {formatPrice(product.compareAtPrice!)}
                </span>
              )}
            </div>
          </div>

          <ProductDescriptionTabs
            tagline={product.tagline}
            description={product.description}
          />

          <div className="flex items-center gap-2 text-sm">
            <span
              className={`size-2 rounded-full ${product.inStock ? "bg-emerald-600" : "bg-muted-foreground"}`}
              aria-hidden
            />
            {product.inStock
              ? product.stockQuantity !== undefined
                ? `${product.stockQuantity} ${product.stockQuantity === 1 ? "unit" : "units"} in stock — dispatched within one working day`
                : "In stock — dispatched within one working day"
              : "Out of stock — ask us when it lands"}
          </div>

          <ProductPurchasePanel product={product} />

          <WhatsAppLink
            message={buildWhatsAppProductEnquiry(product)}
            className="block"
          >
            <Button variant="outline" className="w-full sm:w-auto">
              <MessageCircleIcon /> Ask about this on WhatsApp
            </Button>
          </WhatsAppLink>

          <ul className="border-foreground/12 grid gap-3 border-t pt-6 sm:grid-cols-2">
            {[
              { icon: BadgeCheckIcon, label: "Genuine stock, warranty intact" },
              { icon: TruckIcon, label: "Nationwide delivery" },
            ].map((item) => (
              <li
                key={item.label}
                className="text-muted-foreground flex items-center gap-2 text-sm"
              >
                <item.icon className="text-primary size-4 shrink-0" />
                {item.label}
              </li>
            ))}
          </ul>

          <Accordion type="single" collapsible defaultValue="highlights">
            {product.variants && product.variants.length > 0 ? (
              <AccordionItem value="variants">
                <AccordionTrigger className="font-display text-sm font-bold tracking-wide uppercase">
                  Available options
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="text-muted-foreground space-y-2">
                    {product.variants.map((variant) => (
                      <li key={variant} className="flex gap-2.5">
                        <span
                          className="bg-primary mt-2 size-1.5 shrink-0 rounded-full"
                          aria-hidden
                        />
                        {variant}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            ) : null}
            <AccordionItem value="highlights">
              <AccordionTrigger className="font-display text-sm font-bold tracking-wide uppercase">
                What you get
              </AccordionTrigger>
              <AccordionContent>
                <ul className="text-muted-foreground space-y-2">
                  {product.highlights.map((highlight) => (
                    <li key={highlight} className="flex gap-2.5">
                      <span
                        className="bg-primary mt-2 size-1.5 shrink-0 rounded-full"
                        aria-hidden
                      />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value="delivery">
              <AccordionTrigger className="font-display text-sm font-bold tracking-wide uppercase">
                Delivery &amp; returns
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  Orders confirmed before 3pm go out the same working day.
                  Delivery is free over{" "}
                  {formatPrice(settings.freeDeliveryThreshold)}.
                </p>
                <p>
                  Anything faulty is replaced. Tupperware seals carry the
                  manufacturer&apos;s warranty on top.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </div>

      {/* A room, not a product: the item itself is only ever shown in the
          supplier's own photograph. */}
      <section className="border-foreground/12 relative -mx-4 mt-4 overflow-hidden border-y lg:-mx-8">
        <div className="relative aspect-16/9 max-h-80 w-full sm:aspect-21/9">
          <Image
            src={categoryImage(product.category)}
            alt=""
            fill
            sizes="100vw"
            className="object-cover"
          />
          <div className="from-foreground/75 absolute inset-0 bg-gradient-to-r to-transparent" />
          <div className="absolute inset-0 flex items-center px-4 lg:px-8">
            <p className="font-display text-background max-w-sm text-2xl leading-[1] font-extrabold tracking-tight uppercase sm:text-3xl">
              Made to be used,
              <br />
              not admired.
            </p>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-16 lg:py-24">
          <p className="text-primary text-[11px] font-semibold tracking-[0.24em] uppercase">
            Same shelf
          </p>
          <h2 className="font-display mt-3 mb-8 text-3xl font-extrabold tracking-tight uppercase sm:text-4xl">
            Goes with it
          </h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
