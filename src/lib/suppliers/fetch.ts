import "server-only";

import { allowedHosts, supplierForUrl } from "@/lib/suppliers/registry";
import type { SupplierProduct } from "@/lib/suppliers/types";

/**
 * Reads a product from a partner's own structured data.
 *
 * Retail pages publish a schema.org Product block for search engines — a
 * documented, machine-readable description of the product — so this reads that
 * rather than picking apart markup. A redesign of their page will not silently
 * break the import, and the same code serves every partner: so far one
 * publishes a ProductGroup with variants and another a plain Product, and both
 * fall out of the same walk.
 */

const FETCH_TIMEOUT_MS = 20_000;
const MAX_HTML_BYTES = 6 * 1024 * 1024;
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

/**
 * Guards against SSRF. Without this the import action would fetch any URL an
 * admin pasted, including cloud metadata endpoints and anything else on the
 * private network the server can reach and the internet cannot.
 *
 * The allowlist is the registry, so adding a partner opens exactly their
 * hosts and nothing else.
 */
export function assertAllowedUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("That is not a valid web address.");
  }

  if (url.protocol !== "https:") {
    throw new Error("Only https addresses can be imported.");
  }
  if (!allowedHosts().has(url.hostname.toLowerCase())) {
    throw new Error(`${url.hostname} is not one of the partner sites.`);
  }
  return url;
}

async function fetchText(url: URL) {
  const response = await fetch(url, {
    headers: {
      "user-agent": "AbysHubCatalogueImporter/1.0 (authorised reseller)",
      accept: "text/html",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`That page returned ${response.status}.`);
  // Redirects are followed, and a redirect can leave the allowlist.
  assertAllowedUrl(response.url);

  const text = await response.text();
  if (text.length > MAX_HTML_BYTES) throw new Error("That page is too large to read.");
  return text;
}

type Json = Record<string, unknown>;

function jsonLdBlocks(html: string): Json[] {
  const found: Json[] = [];
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
        if (!entry || typeof entry !== "object") continue;
        const object = entry as Json;
        found.push(object);
        if (Array.isArray(object["@graph"])) {
          for (const node of object["@graph"]) {
            if (node && typeof node === "object") found.push(node as Json);
          }
        }
      }
    } catch {
      // One malformed block should not lose the others.
    }
  }
  return found;
}

function isProduct(node: Json) {
  const type = node["@type"];
  return (Array.isArray(type) ? type : [type]).some(
    (t) => typeof t === "string" && t.includes("Product")
  );
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object") {
    const inner = (value as Json).url ?? (value as Json).name;
    return typeof inner === "string" ? inner : null;
  }
  return null;
}

function priceNumber(value: unknown) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value !== "string") return null;
  const match = value.trim().match(/-?\d[\d,]*(?:\.\d+)?/);
  if (!match) return null;

  const parsed = Number(match[0].replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function ratingNumber(value: unknown) {
  const parsed = priceNumber(value);
  return parsed !== null && parsed >= 0 && parsed <= 5 ? parsed : null;
}

function countNumber(value: unknown) {
  const parsed = priceNumber(value);
  return parsed !== null && parsed >= 0 ? Math.floor(parsed) : null;
}

function optionNames(product: Json, variants: Json[]) {
  const names = variants.map((variant) => clean(variant.name));
  const properties = [product, ...variants]
    .flatMap((item) => (Array.isArray(item.additionalProperty) ? item.additionalProperty : []))
    .filter((property): property is Json => Boolean(property && typeof property === "object"))
    .map((property) => {
      const name = clean(property.name);
      const value = clean(property.value);
      return name && value ? `${name}: ${value}` : value;
    });

  return [...new Set([...names, ...properties].filter(Boolean))].slice(0, 12);
}

/** Copy arrives with entities and stray markup; store it as plain text. */
function clean(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

/** Falls back to Open Graph tags when a page publishes no Product block. */
function openGraph(html: string, property: string) {
  const pattern = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`,
    "i"
  );
  return clean(html.match(pattern)?.[1] ?? "");
}

/**
 * Splits a partner's title into the thing and the branding in front of it.
 *
 * Partners write titles for search engines: "Tupperware® Modular Mates® Square
 * 2 | Food Storage Container 11-cup" names the maker twice before it says what
 * the object is. The card already carries the brand, so that prefix is
 * duplication in the one place a shopper is actually trying to read.
 *
 * The registered marks are the seam. Everything up to the last ® or ™ is the
 * maker and their range; what follows is the product. Only the part before
 * the first pipe is examined, because the descriptive tail after one may name
 * the brand again without it being a prefix.
 */
export function splitTitle(raw: string, brand: string) {
  const full = clean(raw);
  const head = full.split("|")[0];
  const cut = Math.max(head.lastIndexOf("®"), head.lastIndexOf("™"));

  let line = cut >= 0 ? full.slice(0, cut + 1).trim() : "";
  let title = cut >= 0 ? full.slice(cut + 1) : full;

  // A page that never marked its brand should still not repeat it.
  const prefix = brand.trim().toLowerCase();
  if (prefix && title.toLowerCase().startsWith(prefix)) {
    line = line || brand.trim();
    title = title.slice(prefix.length);
  }

  title = title.replace(/^[s|:,–-]+/, "").trim();

  // Never trade a real name for an empty one: a product called nothing but
  // its range keeps the range as its name.
  if (title.length < 3) return { title: full, line: "" };
  return { title, line };
}

export async function readProductPage(rawUrl: string): Promise<SupplierProduct> {
  const url = assertAllowedUrl(rawUrl);
  const supplier = supplierForUrl(url);
  if (!supplier) throw new Error("That address is not one of the partner sites.");

  const html = await fetchText(url);
  const product = jsonLdBlocks(html).find(isProduct);

  function imageUrl(raw: string | null) {
    if (!raw) return null;
    try {
      const image = new URL(raw, url);
      return image.protocol === "https:" ? image.toString() : null;
    } catch {
      return null;
    }
  }

  if (!product) {
    // Some partners render on the client and publish only OG tags. Better a
    // name and a picture to work from than a refusal.
    const name = openGraph(html, "og:title");
    if (!name) {
      throw new Error(
        "No product details were published on that page. Check it is a product page rather than a category listing."
      );
    }
    const og = splitTitle(name, supplier.defaultBrand);

    return {
      supplierId: supplier.id,
      name: og.title,
      productLine: og.line || null,
      description: openGraph(html, "og:description"),
      brand: supplier.defaultBrand,
      sku: null,
      sourceUrl: url.toString(),
      supplierCategory: null,
      imageUrl: imageUrl(openGraph(html, "og:image")),
      listPrice: null,
      listCurrency: supplier.currency,
      rating: null,
      reviewCount: null,
      variants: [],
    };
  }

  const variants = Array.isArray(product.hasVariant) ? (product.hasVariant as Json[]) : [];
  const lead = variants[0] ?? product;

  const rawOffer = lead.offers ?? product.offers;
  const offer = (Array.isArray(rawOffer) ? rawOffer[0] : rawOffer) as Json | undefined;
  const price = offer?.price;

  // A page's own brand beats the partner default: Oriflame pages name the
  // sub-brand, which is what a customer recognises on a product card.
  const brand = clean(firstString(product.brand)) || supplier.defaultBrand;
  const { title, line } = splitTitle(
    clean(product.name) || clean(lead.name) || openGraph(html, "og:title"),
    brand
  );

  const listPrice = priceNumber(price);
  const aggregateRating = product.aggregateRating as Json | undefined;

  return {
    supplierId: supplier.id,
    name: title,
    productLine: line || null,
    description: clean(product.description) || openGraph(html, "og:description"),
    brand,
    sku: firstString(lead.sku ?? product.sku),
    sourceUrl: url.toString(),
    supplierCategory: clean(product.category) || null,
    imageUrl: imageUrl(
      firstString(lead.image ?? product.image) ?? openGraph(html, "og:image")
    ),
    listPrice,
    listCurrency: firstString(offer?.priceCurrency) ?? supplier.currency,
    rating: ratingNumber(aggregateRating?.ratingValue),
    reviewCount: countNumber(
      aggregateRating?.reviewCount ?? aggregateRating?.ratingCount
    ),
    variants: optionNames(product, variants),
  };
}

/** Downloads a partner image so the shop serves its own copy, not a hotlink. */
export async function fetchImage(rawUrl: string) {
  const url = new URL(rawUrl);
  if (url.protocol !== "https:") throw new Error("Image address must be https.");

  const response = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Image returned ${response.status}.`);

  const type = response.headers.get("content-type") ?? "";
  if (!type.startsWith("image/")) throw new Error("That address is not an image.");

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) throw new Error("That image is too large.");

  return { buffer, contentType: type.split(";")[0] };
}
