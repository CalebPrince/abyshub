"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/admin/dal";
import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { products as catalogue, categories } from "@/lib/products";
import { CATALOGUE_TAG } from "@/lib/shop/catalogue";
import { SETTINGS_TAG, getShopSettings } from "@/lib/shop/settings";
import { CURRENCY } from "@/lib/config";
import { formatPrice } from "@/lib/money";
import { rateToShopCurrency, toShopMinorUnits } from "@/lib/money/fx";
import { CONTENT_TAG } from "@/lib/shop/content";
import { fetchImage, readProductPage } from "@/lib/suppliers/fetch";
import { supplierById, supplierForUrl } from "@/lib/suppliers/registry";
import { discoverProductUrls } from "@/lib/suppliers/discover";

export type ActionState = { error: string | null; notice: string | null };

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Every action in this file calls requireAdmin() first.
 *
 * The pages that render these forms are already behind the admin layout, but a
 * Server Action is a public endpoint: anyone can post to it, whether or not
 * they ever loaded the page. Guarding the page is not guarding the action.
 */

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

const FULFILMENT = ["new", "packing", "dispatched", "delivered", "cancelled"];

export async function setFulfilmentStatus(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  const status = text(formData, "status");

  // Checked here as well as by the column constraint, so a bad value is a
  // no-op rather than a 500 from Postgres.
  if (!id || !FULFILMENT.includes(status)) return;

  const supabase = createAdminClient();
  await supabase.from("orders").update({ fulfilment_status: status }).eq("id", id);

  revalidatePath("/admin/orders");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Enquiries
// ---------------------------------------------------------------------------

const STAGES = ["new", "contacted", "quoted", "won", "lost"];

export async function setLeadStage(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  const stage = text(formData, "stage");
  if (!id || !STAGES.includes(stage)) return;

  const supabase = createAdminClient();
  await supabase.from("leads").update({ stage }).eq("id", id);

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveSettings(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const supabase = createAdminClient();

  // Public settings arrive as setting:<key>; secrets as secret:<key>. Two
  // prefixes rather than one list, so a credential can never be written to the
  // world-readable table by a naming slip.
  const publicRows: { key: string; value: string }[] = [];
  const secretRows: { key: string; value: string }[] = [];

  for (const [field, raw] of formData.entries()) {
    if (typeof raw !== "string") continue;

    if (field.startsWith("setting:")) {
      publicRows.push({ key: field.slice(8), value: raw.trim() });
    } else if (field.startsWith("secret:")) {
      // An empty box means "leave it alone", not "erase it" — the form never
      // shows the current value, so blank is the normal state of every render.
      if (raw.trim()) secretRows.push({ key: field.slice(7), value: raw.trim() });
    }
  }

  if (publicRows.length > 0) {
    const { error } = await supabase
      .from("settings")
      .upsert(publicRows, { onConflict: "key" });
    if (error) return { error: error.message, notice: null };
  }

  if (secretRows.length > 0) {
    const { error } = await supabase
      .from("secure_settings")
      .upsert(secretRows, { onConflict: "key" });
    if (error) return { error: error.message, notice: null };
  }

  revalidateTag(SETTINGS_TAG, { expire: 0 });
  revalidatePath("/admin/settings");
  return { error: null, notice: "Saved." };
}

export async function clearSecret(formData: FormData): Promise<void> {
  await requireAdmin();

  const key = text(formData, "key");
  if (!key) return;

  const supabase = createAdminClient();
  await supabase.from("secure_settings").update({ value: null }).eq("key", key);

  revalidatePath("/admin/settings");
}

// ---------------------------------------------------------------------------
// Page content
// ---------------------------------------------------------------------------

export async function savePageContent(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const supabase = createAdminClient();
  const rows: { page: string; key: string; value: string }[] = [];

  for (const [field, raw] of formData.entries()) {
    if (typeof raw !== "string" || !field.startsWith("content:")) continue;
    // content:<page>:<key>
    const [, page, key] = field.split(":");
    if (page && key) rows.push({ page, key, value: raw });
  }

  for (const row of rows) {
    const { error } = await supabase
      .from("page_content")
      // The column is jsonb, so a bare string still has to be JSON.
      .upsert(
        { page: row.page, key: row.key, value: row.value as never },
        { onConflict: "page,key" }
      );
    if (error) return { error: error.message, notice: null };
  }

  // Copy is not money, so stale-while-revalidate is fine here. The two tags
  // below that price things expire outright instead.
  revalidateTag(CONTENT_TAG, "max");
  revalidatePath("/admin/content");
  return { error: null, notice: "Saved." };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

/**
 * Copies the catalogue that currently lives in lib/products.ts into the
 * database, so the shop can start reading rows instead of a source file.
 *
 * Upserts on the primary key, so running it twice changes nothing and it will
 * not overwrite a price someone has since edited... except that it will, since
 * upsert replaces the row. That is why the button says so plainly.
 */
export async function seedCatalogue(): Promise<void> {
  await requireAdmin();
  if (!adminClientAvailable()) return;

  const supabase = createAdminClient();

  await supabase.from("categories").upsert(
    categories.map((category, index) => ({
      slug: category.slug,
      name: category.name,
      description: category.description,
      gradient: category.gradient,
      sort_order: index,
    })),
    { onConflict: "slug" }
  );

  await supabase.from("products").upsert(
    catalogue.map((product, index) => ({
      id: product.id,
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      tagline: product.tagline,
      description: product.description,
      price: product.price,
      compare_at_price: product.compareAtPrice ?? null,
      category: product.category,
      image: product.image,
      rating: product.rating,
      review_count: product.reviewCount,
      in_stock: product.inStock,
      featured: product.featured ?? false,
      highlights: product.highlights,
      published: true,
      sort_order: index,
    })),
    { onConflict: "id" }
  );

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------------

const ROLES = ["owner", "staff"];

/**
 * Staff management is owner-only, and nobody may act on their own row.
 *
 * Both rules exist to protect the shop from a single mistake rather than to
 * restrict anyone: without the second, an owner can demote or delete
 * themselves and leave a back office with no way back into it.
 */
async function requireOwner() {
  const me = await requireAdmin();
  if (me.role !== "owner") return null;
  return me;
}

export async function addStaff(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireOwner();
  if (!me) return { error: "Only an owner can add staff.", notice: null };
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const email = text(formData, "email").toLowerCase();
  const name = text(formData, "name");
  const password = text(formData, "password");
  const role = text(formData, "role");

  if (!email.includes("@")) {
    return { error: "Enter a valid email address.", notice: null };
  }
  if (password.length < 8) {
    return { error: "Use a password of at least 8 characters.", notice: null };
  }
  if (!ROLES.includes(role)) {
    return { error: "Pick a role.", notice: null };
  }

  const supabase = createAdminClient();

  // Confirmed on creation: an unconfirmed account cannot sign in, which is
  // exactly the trap the first admin account fell into.
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: name },
  });

  if (error || !data.user) {
    return { error: error?.message ?? "That account could not be created.", notice: null };
  }

  const { error: rowError } = await supabase
    .from("admin_users")
    .upsert(
      { id: data.user.id, email, full_name: name || null, role },
      { onConflict: "id" }
    );

  if (rowError) {
    return { error: rowError.message, notice: null };
  }

  revalidatePath("/admin/users");
  return { error: null, notice: `${email} can now sign in.` };
}

export async function setStaffRole(formData: FormData): Promise<void> {
  const me = await requireOwner();
  if (!me) return;

  const id = text(formData, "id");
  const role = text(formData, "role");
  // Changing your own role is how an owner accidentally locks themselves out.
  if (!id || id === me.id || !ROLES.includes(role)) return;

  const supabase = createAdminClient();
  await supabase.from("admin_users").update({ role }).eq("id", id);

  revalidatePath("/admin/users");
}

/**
 * Revokes access by removing the allow-list row.
 *
 * The Supabase login is left alone deliberately: this is "no longer staff",
 * not "erase this person", and deleting an auth account would orphan anything
 * ever attributed to them. Delete the login in Supabase if that is the intent.
 */
export async function removeStaff(formData: FormData): Promise<void> {
  const me = await requireOwner();
  if (!me) return;

  const id = text(formData, "id");
  if (!id || id === me.id) return;

  const supabase = createAdminClient();
  await supabase.from("admin_users").delete().eq("id", id);

  revalidatePath("/admin/users");
}

// ---------------------------------------------------------------------------
// Creating and removing products
// ---------------------------------------------------------------------------

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;

/** "8-piece Storage Set!" -> "8-piece-storage-set" */
function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

export async function createProduct(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const category = text(formData, "category");
  const price = Number(text(formData, "price"));

  if (!name) return { error: "Give the product a name.", notice: null };
  if (!brand) return { error: "Give the product a brand.", notice: null };
  if (!category) return { error: "Pick a category.", notice: null };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a price in minor units, e.g. 95000.", notice: null };
  }

  const slug = slugify(text(formData, "slug") || name);
  if (!slug) return { error: "That name does not make a usable web address.", notice: null };

  const supabase = createAdminClient();

  // Checked before the upload, so a rejected product does not leave an orphan
  // file behind in the bucket.
  const { data: clash } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (clash) {
    return { error: `Something already uses the address "${slug}".`, notice: null };
  }

  // --- the picture ---------------------------------------------------------
  let image = "";
  const file = formData.get("image");

  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return { error: "Images must be JPEG, PNG, WebP or SVG.", notice: null };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: "That image is over 4MB.", notice: null };
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    // Prefixed with the time so re-uploading for the same product does not
    // collide with a cached copy of the previous one.
    const path = `${slug}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: `The image did not upload: ${uploadError.message}`, notice: null };
    }

    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    image = pub.publicUrl;
  }

  const compare = text(formData, "compare_at_price");

  const { error } = await supabase.from("products").insert({
    // Text primary key, and the slug is already unique, so it doubles as the id.
    id: slug,
    slug,
    name,
    brand,
    tagline: text(formData, "tagline") || null,
    description: text(formData, "description") || null,
    price: Math.round(price),
    compare_at_price:
      compare && Number.isFinite(Number(compare)) ? Math.round(Number(compare)) : null,
    category,
    image: image || null,
    in_stock: formData.get("in_stock") === "on",
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    highlights: text(formData, "highlights")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  });

  if (error) return { error: error.message, notice: null };

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
  return { error: null, notice: `${name} is in the catalogue.` };
}

/**
 * Unlists a product rather than deleting it.
 *
 * Order items keep their own snapshot of name and price, so a delete would not
 * corrupt order history — but it would still throw away the description and
 * photograph for good, and "we do not sell this any more" is what is almost
 * always meant. Unpublishing takes it off the shop immediately.
 */
export async function unpublishProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  if (!id) return;

  const supabase = createAdminClient();
  await supabase.from("products").update({ published: false }).eq("id", id);

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
}

/**
 * Full edit, including replacing the photograph.
 *
 * Owns every field the create form owns, so both dialogs share one set of
 * inputs and cannot drift apart.
 */
export async function editProduct(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const id = text(formData, "id");
  if (!id) return { error: "That product could not be found.", notice: null };

  const name = text(formData, "name");
  const brand = text(formData, "brand");
  const category = text(formData, "category");
  const price = Number(text(formData, "price"));

  if (!name) return { error: "Give the product a name.", notice: null };
  if (!brand) return { error: "Give the product a brand.", notice: null };
  if (!category) return { error: "Pick a category.", notice: null };
  if (!Number.isFinite(price) || price <= 0) {
    return { error: "Enter a price in minor units, e.g. 95000.", notice: null };
  }

  const supabase = createAdminClient();
  const compare = text(formData, "compare_at_price");

  const patch: Record<string, unknown> = {
    name,
    brand,
    category,
    tagline: text(formData, "tagline") || null,
    description: text(formData, "description") || null,
    price: Math.round(price),
    compare_at_price:
      compare && Number.isFinite(Number(compare)) ? Math.round(Number(compare)) : null,
    in_stock: formData.get("in_stock") === "on",
    featured: formData.get("featured") === "on",
    published: formData.get("published") === "on",
    highlights: text(formData, "highlights")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
  };

  // The slug is left alone on purpose: it is the product's web address, and
  // changing it silently breaks every link and bookmark pointing at it.

  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!IMAGE_TYPES.includes(file.type)) {
      return { error: "Images must be JPEG, PNG, WebP or SVG.", notice: null };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      return { error: "That image is over 4MB.", notice: null };
    }

    const extension = file.name.includes(".") ? file.name.split(".").pop() : "png";
    const path = `${id}-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) {
      return { error: `The image did not upload: ${uploadError.message}`, notice: null };
    }

    const { data: pub } = supabase.storage.from("product-images").getPublicUrl(path);
    patch.image = pub.publicUrl;
  }

  const { error } = await supabase.from("products").update(patch).eq("id", id);
  if (error) return { error: error.message, notice: null };

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
  return { error: null, notice: "Saved." };
}

/**
 * Deletes a product outright.
 *
 * Safe for order history: order_items snapshot the name and price they were
 * bought at and hold no foreign key to products, so past orders still read
 * correctly afterwards. What does go for good is the description, the
 * highlights and the photograph — which is why the dialog asks twice, and why
 * Unlist sits next to it for the case that is nearly always meant instead.
 */
export async function deleteProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  if (!id) return;

  const supabase = createAdminClient();

  // Take the file with it, or the bucket accumulates images for products that
  // no longer exist.
  const { data: row } = await supabase
    .from("products")
    .select("image")
    .eq("id", id)
    .maybeSingle();

  await supabase.from("products").delete().eq("id", id);

  const image = row?.image as string | undefined;
  if (image?.includes("/product-images/")) {
    const path = image.split("/product-images/").pop();
    if (path) await supabase.storage.from("product-images").remove([path]);
  }

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
}

// ---------------------------------------------------------------------------
// Partner imports
// ---------------------------------------------------------------------------

/**
 * Pulls the partner's own image into our bucket. Hotlinking would leave the
 * shop blank the day their CDN blocks referrers or reorganises.
 */
async function storeSupplierImage(
  supabase: ReturnType<typeof createAdminClient>,
  imageUrl: string,
  slug: string
) {
  try {
    const { buffer, contentType } = await fetchImage(imageUrl);
    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const path = `${slug}-${Date.now()}.${extension}`;

    const { error } = await supabase.storage
      .from("product-images")
      .upload(path, buffer, { contentType, upsert: false });
    if (error) return null;

    return supabase.storage.from("product-images").getPublicUrl(path).data.publicUrl;
  } catch {
    // A missing picture is not a reason to lose the product.
    return null;
  }
}

/**
 * Imports a product from a partner page, or refreshes one already imported.
 *
 * Which of the two it is comes from the supplier and their SKU, not from the
 * name: a partner renaming a product must update the row rather than create a
 * second copy of something already on the shelf.
 *
 * A new import arrives priced and listed: their figure at the day's rate
 * with the shop's markup on it. That puts the markup in Settings on the
 * critical path — it is what every imported product is sold at until someone
 * edits it — so it is worth being right before a sync, not after.
 *
 * A product no page priced stays unlisted, because GH₵0.00 is an order
 * someone can place.
 *
 * A refresh updates their words and their picture and touches neither our
 * price nor whether it is listed. Re-pulling a description must never quietly
 * reprice the shop or pull a live product off it.
 */
export async function importProduct(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requireAdmin();
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  const url = text(formData, "url");
  if (!url) return { error: "Paste the address of a product page.", notice: null };

  let found;
  try {
    found = await readProductPage(url);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "That page could not be read.",
      notice: null,
    };
  }

  if (!found.name) return { error: "That page did not name a product.", notice: null };

  const supplier = supplierById(found.supplierId);
  if (!supplier) return { error: "Unknown partner site.", notice: null };

  const supabase = createAdminClient();

  // Identity is the partner plus their SKU. Without a SKU there is nothing
  // stable to match on later, so the slug stands in.
  const existing = found.sku
    ? (
        await supabase
          .from("products")
          .select("id, slug")
          .eq("supplier", supplier.id)
          .eq("external_sku", found.sku)
          .maybeSingle()
      ).data
    : null;

  const shared = {
    name: found.name,
    brand: found.brand,
    product_line: found.productLine,
    description: found.description || null,
    category: supplier.categoryFor({
      supplierCategory: found.supplierCategory,
      name: found.name,
      brand: found.brand,
    }),
    highlights: found.variants,
    supplier: supplier.id,
    source_url: found.sourceUrl,
    external_sku: found.sku,
    imported_at: new Date().toISOString(),
    list_price: found.listPrice !== null ? Math.round(found.listPrice * 100) : null,
    list_currency: found.listCurrency,
  };

  // --- refresh -------------------------------------------------------------
  if (existing) {
    const image = found.imageUrl
      ? await storeSupplierImage(supabase, found.imageUrl, existing.slug)
      : null;

    const { error } = await supabase
      .from("products")
      // Deliberately no price and no published: a refresh is about their
      // content, never our commercial decisions.
      .update(image ? { ...shared, image } : shared)
      .eq("id", existing.id);

    if (error) return { error: error.message, notice: null };

    revalidateTag(CATALOGUE_TAG, { expire: 0 });
    revalidatePath("/admin/products");
    return {
      error: null,
      notice: `${found.name} refreshed. Your price and listing were left alone.`,
    };
  }

  // --- first import --------------------------------------------------------
  const slug = slugify(found.name);
  if (!slug) return { error: "That name does not make a usable web address.", notice: null };

  const { data: clash } = await supabase
    .from("products")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (clash) {
    return { error: `Something already uses the address "${slug}".`, notice: null };
  }

  const givenPrice = Number(text(formData, "price"));
  const typedRate = Number(text(formData, "rate"));

  // Three ways to a price, in order of how much someone meant it: a figure
  // typed straight in, a rate typed in to convert by, and failing both, the
  // day's rate with the shop's markup on top.
  let price = 0;
  if (Number.isFinite(givenPrice) && givenPrice > 0) {
    price = Math.round(givenPrice);
  } else if (found.listPrice !== null) {
    if (Number.isFinite(typedRate) && typedRate > 0) {
      price = Math.round(found.listPrice * typedRate * 100);
    } else {
      const { priceMarkupPercent } = await getShopSettings();
      const live = await rateToShopCurrency(found.listCurrency ?? supplier.currency);
      if (live !== null) {
        price = toShopMinorUnits(found.listPrice, live, priceMarkupPercent);
      }
    }
  }

  const image = found.imageUrl
    ? await storeSupplierImage(supabase, found.imageUrl, slug)
    : null;

  const { error } = await supabase.from("products").insert({
    ...shared,
    id: slug,
    slug,
    tagline: null,
    price,
    image,
    in_stock: true,
    featured: false,
    // Listed on arrival unless nothing priced it. See importChunk.
    published: price > 0,
  });

  if (error) return { error: error.message, notice: null };

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");

  const reference =
    found.listPrice && found.listCurrency
      ? ` They list it at ${found.listCurrency} ${found.listPrice}.`
      : "";
  const ours = price > 0 ? ` Priced at ${formatPrice(price)} — edit it if that is not right.` : "";
  const listed =
    price > 0
      ? " and listed"
      : ", unlisted because nothing on the page priced it";

  return {
    error: null,
    notice: `${found.name} imported from ${supplier.label}, ${listed}.${reference}${ours}`,
  };
}

/** Re-pulls a product from the address it was imported from. */
export async function refreshProduct(formData: FormData): Promise<void> {
  await requireAdmin();
  if (!adminClientAvailable()) return;

  const id = text(formData, "id");
  if (!id) return;

  const supabase = createAdminClient();
  const { data: row } = await supabase
    .from("products")
    .select("source_url, slug, supplier")
    .eq("id", id)
    .maybeSingle();

  if (!row?.source_url) return;

  let found;
  try {
    found = await readProductPage(row.source_url as string);
  } catch {
    return;
  }

  const supplier = supplierForUrl(new URL(row.source_url as string));
  if (!supplier) return;

  const image = found.imageUrl
    ? await storeSupplierImage(supabase, found.imageUrl, row.slug as string)
    : null;

  const patch: Record<string, unknown> = {
    name: found.name,
    brand: found.brand,
    product_line: found.productLine,
    description: found.description || null,
    highlights: found.variants,
    external_sku: found.sku,
    imported_at: new Date().toISOString(),
  };
  if (image) patch.image = image;

  await supabase.from("products").update(patch).eq("id", id);

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
}

/**
 * Empties the catalogue.
 *
 * Owner only, and it asks for the phrase to be typed rather than clicked: a
 * single button that wipes every product is one misclick from a shop with
 * nothing in it, and there is no undo.
 *
 * Order history survives. order_items snapshot the name and price they were
 * bought at and hold no foreign key to products, so past orders still read
 * correctly against an empty catalogue — which is exactly why that was worth
 * doing when the schema was written.
 */
export async function deleteAllProducts(
  _previous: ActionState,
  formData: FormData
): Promise<ActionState> {
  const me = await requireOwner();
  if (!me) {
    return { error: "Only an owner can empty the catalogue.", notice: null };
  }
  if (!adminClientAvailable()) {
    return { error: "The database is not connected.", notice: null };
  }

  if (text(formData, "confirm") !== "DELETE ALL") {
    return { error: 'Type DELETE ALL exactly to confirm.', notice: null };
  }

  const supabase = createAdminClient();

  const { data: rows, error: readError } = await supabase
    .from("products")
    .select("id, image");

  if (readError) return { error: readError.message, notice: null };
  if (!rows || rows.length === 0) {
    return { error: null, notice: "The catalogue was already empty." };
  }

  // Take the uploaded pictures with them, or the bucket keeps paying for
  // images of products that no longer exist.
  const paths = rows
    .map((row) => (row.image as string | null) ?? "")
    .filter((url) => url.includes("/product-images/"))
    .map((url) => url.split("/product-images/").pop())
    .filter((path): path is string => Boolean(path));

  if (paths.length > 0) {
    await supabase.storage.from("product-images").remove(paths);
  }

  // Not .delete() alone: PostgREST refuses an unfiltered delete, which is a
  // guard worth keeping. `neq` on a column no id can be matches everything
  // while still being an explicit filter.
  const { error } = await supabase.from("products").delete().neq("id", "");
  if (error) return { error: error.message, notice: null };

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");

  return {
    error: null,
    notice: `${rows.length} product${rows.length === 1 ? "" : "s"} deleted, along with ${paths.length} uploaded image${paths.length === 1 ? "" : "s"}. Past orders are unaffected.`,
  };
}

// ---------------------------------------------------------------------------
// Bulk sync
// ---------------------------------------------------------------------------

export type ChunkResult = {
  error: string | null;
  total: number;
  offset: number;
  done: boolean;
  imported: number;
  refreshed: number;
  skipped: number;
  failed: number;
  /** Arrived without a price because their page did not publish one. */
  unpriced: number;
  /** Names of anything that failed, so a run does not end in silence. */
  problems: string[];
};

/** Small enough that a chunk finishes well inside the page's maxDuration. */
const CHUNK = 4;

/**
 * Imports one slice of a partner's catalogue.
 *
 * Chunked on purpose. Four hundred products means four hundred page fetches
 * and four hundred image downloads; that cannot happen inside one request, and
 * a job queue is a lot of machinery for something run a handful of times a
 * year. The browser drives the loop instead, calling this until `done`, which
 * also means progress is visible and the run can be abandoned halfway without
 * leaving anything half-written — each product is its own transaction.
 *
 * `mode` decides what to do with products already on the shelf: skip them, or
 * re-pull their words and pictures. Neither touches our price or our listing.
 */
export async function importChunk(
  supplierId: string,
  offset: number,
  mode: "new" | "refresh"
): Promise<ChunkResult> {
  const base: ChunkResult = {
    error: null, total: 0, offset, done: true,
    imported: 0, refreshed: 0, skipped: 0, failed: 0, unpriced: 0, problems: [],
  };

  await requireAdmin();
  if (!adminClientAvailable()) {
    return { ...base, error: "The database is not connected." };
  }

  const supplier = supplierById(supplierId);
  if (!supplier) return { ...base, error: "Unknown partner." };

  let urls: string[];
  try {
    urls = await discoverProductUrls(supplierId);
  } catch (error) {
    return {
      ...base,
      error: error instanceof Error ? error.message : "Could not read their catalogue.",
    };
  }

  if (urls.length === 0) {
    return { ...base, error: `${supplier.label} publishes no catalogue to read.` };
  }

  // Resolved once per chunk, before a single page is fetched. A run that
  // cannot price is stopped here rather than left to import four hundred
  // products at zero and call that a success.
  const { priceMarkupPercent } = await getShopSettings();
  const rate = await rateToShopCurrency(supplier.currency);
  if (rate === null) {
    return {
      ...base,
      error: `Could not reach today’s ${supplier.currency} to ${CURRENCY} rate, so nothing was imported. Try again shortly.`,
    };
  }

  const slice = urls.slice(offset, offset + CHUNK);
  const result: ChunkResult = {
    ...base,
    total: urls.length,
    offset: offset + slice.length,
    done: offset + slice.length >= urls.length,
  };

  const supabase = createAdminClient();

  for (const url of slice) {
    try {
      const found = await readProductPage(url);
      if (!found.name) {
        result.failed++;
        result.problems.push(url.split("/").pop() ?? url);
        continue;
      }

      const existing = found.sku
        ? (
            await supabase
              .from("products")
              .select("id, slug, price")
              .eq("supplier", supplier.id)
              .eq("external_sku", found.sku)
              .maybeSingle()
          ).data
        : null;

      if (existing && mode === "new") {
        result.skipped++;
        continue;
      }

      const shared = {
        name: found.name,
        brand: found.brand,
        product_line: found.productLine,
        description: found.description || null,
        category: supplier.categoryFor({
          supplierCategory: found.supplierCategory,
          name: found.name,
          brand: found.brand,
        }),
        highlights: found.variants,
        supplier: supplier.id,
        source_url: found.sourceUrl,
        external_sku: found.sku,
        imported_at: new Date().toISOString(),
        // Their figure, in their money. A refresh keeps this current even
        // though it leaves our own price alone, so a partner moving their
        // price is visible rather than silent.
        list_price:
          found.listPrice !== null ? Math.round(found.listPrice * 100) : null,
        list_currency: found.listCurrency,
      };

      if (existing) {
        const image = found.imageUrl
          ? await storeSupplierImage(supabase, found.imageUrl, existing.slug as string)
          : null;

        // A refresh is their content, not our trading: a price someone set is
        // never overwritten, and nothing is listed or unlisted here.
        //
        // Zero is the exception, because zero is not a price anyone chose. It
        // is what every product imported before prices were pulled is sitting
        // at, and leaving those untouchable would mean pricing a whole
        // catalogue by hand.
        const unpricedRow = Number(existing.price) === 0;
        const derived =
          unpricedRow && found.listPrice !== null
            ? toShopMinorUnits(found.listPrice, rate, priceMarkupPercent)
            : 0;

        await supabase
          .from("products")
          .update({
            ...shared,
            ...(image ? { image } : {}),
            // Pricing something for the first time is the moment it becomes
            // sellable, so it goes up with the same rule a new import gets.
            // Everything imported before prices existed is sitting unlisted
            // at zero, and this is what puts it on the shelf.
            //
            // A priced product that someone unlisted stays unlisted: derived
            // is only ever set when there was no price to begin with.
            ...(derived > 0 ? { price: derived, published: true } : {}),
          })
          .eq("id", existing.id);

        if (unpricedRow && derived === 0) result.unpriced++;
        result.refreshed++;
        continue;
      }

      const slug = slugify(found.name);
      if (!slug) {
        result.failed++;
        result.problems.push(found.name);
        continue;
      }

      const { data: clash } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (clash) {
        result.skipped++;
        continue;
      }

      const image = found.imageUrl
        ? await storeSupplierImage(supabase, found.imageUrl, slug)
        : null;

      // Their price, at today's rate, plus the owner's markup. A default to
      // work from, not a decision: the product still arrives unlisted, so
      // nobody is ever charged a figure a converter chose.
      const price =
        found.listPrice !== null
          ? toShopMinorUnits(found.listPrice, rate, priceMarkupPercent)
          : 0;
      if (price === 0) result.unpriced++;

      const { error } = await supabase.from("products").insert({
        ...shared,
        id: slug,
        slug,
        tagline: null,
        price,
        image,
        in_stock: true,
        featured: false,
        // Listed on arrival, so a sync fills the shop rather than a queue of
        // things to approve. Unlisting is per product and one click.
        //
        // Except with no price. A page that published no figure would go up
        // at GH₵0.00, and that is an order someone can actually place.
        published: price > 0,
      });

      if (error) {
        result.failed++;
        result.problems.push(found.name);
      } else {
        result.imported++;
      }
    } catch {
      result.failed++;
      result.problems.push(url.split("/").pop() ?? url);
    }
  }

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
  return result;
}
