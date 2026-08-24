import "server-only";

/**
 * Reads a product from a supplier's own structured data.
 *
 * Retail pages publish a schema.org Product / ProductGroup block for search
 * engines; that is a documented, machine-readable description of the product,
 * so this reads it rather than picking apart markup. It also means a redesign
 * of their page does not silently break the import.
 */

/** Only these hosts may be fetched. */
const ALLOWED_HOSTS = new Set(["tupperware.com", "www.tupperware.com"]);

const FETCH_TIMEOUT_MS = 20_000;
const MAX_HTML_BYTES = 4 * 1024 * 1024;
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

export type ImportedProduct = {
  name: string;
  description: string;
  sku: string | null;
  sourceUrl: string;
  supplierCategory: string | null;
  imageUrl: string | null;
  /** The supplier's own price, in their currency — never used as ours. */
  listPrice: number | null;
  listCurrency: string | null;
  variants: string[];
};

/**
 * Guards against SSRF. Without a host allowlist this action would fetch any
 * URL an admin pasted, including a cloud metadata endpoint or something on the
 * private network the server can reach and the internet cannot.
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
  if (!ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new Error(
      `Only tupperware.com product pages can be imported, not ${url.hostname}.`
    );
  }
  return url;
}

async function fetchText(url: URL) {
  const response = await fetch(url, {
    // Redirects are followed by default, and a redirect could leave the
    // allowlist — so the final URL is checked again below.
    headers: {
      "user-agent": "AbysHubCatalogueImporter/1.0 (+authorised Tupperware reseller)",
      accept: "text/html",
    },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`That page returned ${response.status}.`);
  }
  assertAllowedUrl(response.url);

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > MAX_HTML_BYTES) throw new Error("That page is too large to read.");

  const text = await response.text();
  if (text.length > MAX_HTML_BYTES) throw new Error("That page is too large to read.");
  return text;
}

type Json = Record<string, unknown>;

function blocks(html: string): Json[] {
  const found: Json[] = [];
  const pattern =
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;

  for (const match of html.matchAll(pattern)) {
    try {
      const parsed: unknown = JSON.parse(match[1].trim());
      for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
        if (entry && typeof entry === "object") found.push(entry as Json);
      }
    } catch {
      // A single malformed block should not lose the others.
    }
  }
  return found;
}

function isProduct(node: Json) {
  const type = node["@type"];
  const types = Array.isArray(type) ? type : [type];
  return types.some((t) => typeof t === "string" && t.includes("Product"));
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return firstString(value[0]);
  if (value && typeof value === "object") {
    const url = (value as Json).url ?? (value as Json).name;
    return typeof url === "string" ? url : null;
  }
  return null;
}

/** Marketing copy arrives with entities and stray markup; leave it as plain text. */
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

export async function readProductPage(rawUrl: string): Promise<ImportedProduct> {
  const url = assertAllowedUrl(rawUrl);
  const html = await fetchText(url);

  const product = blocks(html).find(isProduct);
  if (!product) {
    throw new Error(
      "No product details were published on that page. Check it is a product page rather than a category listing."
    );
  }

  const variants = Array.isArray(product.hasVariant)
    ? (product.hasVariant as Json[])
    : [];
  const lead = variants[0] ?? product;

  // Offers can be a single object or a list, and sit on the group or a variant.
  const rawOffer = lead.offers ?? product.offers;
  const offer = (Array.isArray(rawOffer) ? rawOffer[0] : rawOffer) as Json | undefined;
  const price = offer?.price;

  return {
    name: clean(product.name) || clean(lead.name),
    description: clean(product.description),
    sku: firstString(lead.sku ?? product.sku),
    sourceUrl: url.toString(),
    supplierCategory: clean(product.category) || null,
    imageUrl: firstString(lead.image ?? product.image),
    listPrice: price !== undefined && Number.isFinite(Number(price)) ? Number(price) : null,
    listCurrency: firstString(offer?.priceCurrency),
    // Kept so the colours and sizes on offer are visible when pricing it.
    variants: variants
      .map((v) => clean(v.name))
      .filter(Boolean)
      .slice(0, 12),
  };
}

/** Downloads a supplier image so the shop serves its own copy, not a hotlink. */
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

/** Best guess at one of our categories; the admin can correct it. */
export function guessCategory(supplierCategory: string | null, name: string) {
  const haystack = `${supplierCategory ?? ""} ${name}`.toLowerCase();
  const rules: [RegExp, string][] = [
    [/lunch|tumbler|bottle|sipper|on the go|flask/, "on-the-go"],
    [/bowl|jug|tray|serve|platter|dish/, "serveware"],
    [/chop|prep|knife|grate|peel|cook|microwave|mix/, "kitchen-prep"],
    [/clean|organis|organiz|laundry|storage rack|home care/, "home-care"],
    [/storage|container|canister|freezer|fridge|modular|seal|keeper/, "food-storage"],
  ];
  for (const [pattern, slug] of rules) if (pattern.test(haystack)) return slug;
  return "food-storage";
}
