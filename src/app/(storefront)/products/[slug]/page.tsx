import * as React from "react";
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
import {
  ProductGallery,
  ProductVariantPicker,
  ProductVideoSection,
  type GalleryVariant,
} from "@/components/store/product-gallery";
import { ProductVariantProvider } from "@/components/store/product-variant-context";
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

// Anything not prerendered below is still rendered on first request and then
// cached and revalidated exactly like a built page — CATALOGUE_TAG and the
// catalogue TTL cover both. This is the default, stated here because the list
// is deliberately partial.
export const dynamicParams = true;

export async function generateStaticParams() {
  // Only the featured products are built ahead of time. Prerendering the whole
  // catalogue baked hundreds of product pages into every deployment — the bulk
  // of the Vercel deployment-storage bill — and regenerated every one of them
  // on each catalogue revalidation. The rest are built on first visit.
  return (await getProducts())
    .filter((product) => product.featured)
    .slice(0, 24)
    .map((product) => ({ slug: product.slug }));
}

/**
 * Supabase Storage sends every object back with `x-robots-tag: none`, which
 * a link-preview crawler (WhatsApp, Facebook — the ones that matter for a
 * product someone is sharing) takes as "do not show this". Routing the same
 * photograph through our own image optimiser re-serves it from this domain
 * with clean headers, so the crawler gets a picture instead of a bare link.
 */
function ogImageUrl(image: string) {
  // 75 rather than a nicer-looking number: next.config.ts does not list any
  // other quality as allowed, and the optimiser 400s on one that is not.
  return `/_next/image?url=${encodeURIComponent(image)}&w=1200&q=75`;
}

/**
 * A handful of products whose real photograph is a tall product-box shot —
 * exactly right for the gallery, wrong for a link preview. WhatsApp in
 * particular renders nothing at all for an og:image far from landscape
 * rather than cropping it, so those get a purpose-cropped 1200x630 standing
 * in for sharing only; the product page itself still shows the real photo.
 */
const OG_IMAGE_OVERRIDES: Record<string, string> = {
  "aer-power-pocket-bathroom-fragrance": "/products/aer-power-pocket-og.jpg",
};

/**
 * Same idea as the og:image override above, one step further: the DB has
 * nowhere to pin a photograph to a specific variant, so a product that
 * needs "pick Sea Breeze, see Sea Breeze" gets that pairing hardcoded here
 * until enough products want it to earn a column. All six of the client's
 * confirmed fragrances now have their own real photograph.
 */
const VARIANT_GALLERY: Record<
  string,
  { label: string; options: GalleryVariant[] }
> = {
  "aer-power-pocket-bathroom-fragrance": {
    label: "Fragrance",
    options: [
      {
        name: "Sea Breeze",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789547954001-0.jpeg",
      },
      {
        name: "Lemon Tangy Delight",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789547956554-4.jpeg",
      },
      {
        name: "Berry Rush",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789547955908-3.jpeg",
      },
      {
        name: "Lavender Bloom",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789508224570-0.jpg",
      },
      {
        name: "Rose Fresh Blossom",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789547954707-1.jpeg",
      },
      {
        name: "Jasmine Floral Delight",
        image:
          "https://mttcglcnjvvfbxzgjggj.supabase.co/storage/v1/object/public/product-images/aer-power-pocket-bathroom-fragrance-1789547955297-2.jpeg",
      },
    ],
  },
};

/**
 * A product video, same per-slug pattern as the maps above: nowhere in the
 * schema to hold one, so it lives here until enough products have one to
 * earn an admin field of their own.
 */
const PRODUCT_VIDEO: Record<string, string> = {
  "aer-power-pocket-bathroom-fragrance": "https://www.youtube.com/watch?v=uE1BrDy6Mlk",
};

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = (await getProducts()).find((item) => item.slug === slug);

  if (!product) return { title: "Product not found" };

  const ogImage = OG_IMAGE_OVERRIDES[slug];
  const image = ogImage
    ? { url: ogImage, width: 1200, height: 630 }
    : product.image
      ? { url: ogImageUrl(product.image) }
      : null;

  return {
    title: `${product.name} | ${product.brand}`,
    description: product.tagline,
    openGraph: {
      type: "website",
      url: `/products/${slug}`,
      title: product.name,
      description: product.tagline,
      images: image ? [image] : [],
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
  const variantGallery = VARIANT_GALLERY[slug];

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

      {/* No overflow-hidden: it would make this the nearest scroll container
          for the sticky photo beside it, which parks the photo partway down
          the card and never holds it in view. Nothing bleeds to the card edge
          any more — the photo carries its own inset, rounded frame. */}
      <ProductVariantProvider variants={variantGallery?.options}>
      <div className="border-foreground/12 grid rounded-2xl border lg:grid-cols-2">
        {/* Sticky against the viewport, which needs the card to not be a
            scroll container — see the note on the card itself. top-28 clears
            the 121px header when the photo is held in view. */}
        <div className="border-foreground/12 min-w-0 border-b lg:sticky lg:top-28 lg:self-start lg:border-b-0">
          <ProductGallery
            images={gallery}
            name={product.name}
            video={PRODUCT_VIDEO[slug]}
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

          {/* Right beside the photographs rather than under them — Amazon's
              placement for a scent/colour picker, and the reason it lives in
              this column at all rather than inside ProductGallery. */}
          {variantGallery ? (
            <ProductVariantPicker label={variantGallery.label} />
          ) : null}

          {/* "About this item" — promoted out of the accordion and onto the
              page itself. Amazon leads with these bullets because they are
              the fastest answer to "is this the thing I want", and burying
              them a click away just makes someone scroll past the buy box
              twice. */}
          {product.highlights.length > 0 ? (
            <div className="border-foreground/12 border-t pt-6">
              <p className="font-display text-sm font-bold tracking-wide uppercase">
                About this item
              </p>
              <ul className="text-muted-foreground mt-3 space-y-2">
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
            </div>
          ) : null}

          {/* The buy box: everything to do with the decision to purchase,
              set apart in its own card rather than blended into the reading
              copy above it — a border a shopper's eye can use to find price
              and "add to cart" again after reading the bullets. */}
          <div className="border-foreground/15 bg-secondary/10 space-y-5 rounded-xl border-2 p-5 sm:p-6">
            <div>
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
              {onSale && (
                <p className="text-primary mt-1 text-sm font-semibold">
                  Save {formatPrice(product.compareAtPrice! - product.price)}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span
                className={`size-2 rounded-full ${product.inStock ? "bg-emerald-600" : "bg-muted-foreground"}`}
                aria-hidden
              />
              {product.inStock
                ? product.stockQuantity !== undefined
                  ? `${product.stockQuantity} left in stock, dispatched within one working day`
                  : "In stock, dispatched within one working day"
                : "Out of stock, ask us when it lands"}
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

            <ul className="border-foreground/12 grid gap-3 border-t pt-5 sm:grid-cols-2">
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
          </div>

          <ProductDescriptionTabs
            tagline={product.tagline}
            description={product.description}
          />

          <ProductVideoSection video={PRODUCT_VIDEO[slug]} name={product.name} />

          {/* A small spec sheet — Amazon's "Product information" table, cut
              down to the facts this catalogue actually holds rather than
              padded out with placeholders for fields it doesn't. */}
          <div className="border-foreground/12 border-t pt-6">
            <p className="font-display text-sm font-bold tracking-wide uppercase">
              Product information
            </p>
            <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
              {[
                ["Brand", product.brand],
                ...(product.productLine ? [["Range", product.productLine]] : []),
                ["Category", category?.name ?? product.category],
                ["Availability", product.inStock ? "In stock" : "Out of stock"],
              ].map(([label, value]) => (
                <React.Fragment key={label}>
                  <dt className="text-muted-foreground">{label}</dt>
                  <dd className="font-medium">{value}</dd>
                </React.Fragment>
              ))}
            </dl>
          </div>

          <Accordion type="single" collapsible>
            {!variantGallery && product.variants && product.variants.length > 0 ? (
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
      </ProductVariantProvider>

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
