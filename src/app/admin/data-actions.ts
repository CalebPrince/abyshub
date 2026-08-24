"use server";

import { revalidatePath, revalidateTag } from "next/cache";

import { requireAdmin } from "@/lib/admin/dal";
import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { products as catalogue, categories } from "@/lib/products";
import { CATALOGUE_TAG } from "@/lib/shop/catalogue";
import { SETTINGS_TAG } from "@/lib/shop/settings";
import { CONTENT_TAG } from "@/lib/shop/content";

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

export async function updateProduct(formData: FormData): Promise<void> {
  await requireAdmin();

  const id = text(formData, "id");
  if (!id) return;

  const price = Number(text(formData, "price"));
  const compare = text(formData, "compare_at_price");

  const patch: Record<string, unknown> = {
    in_stock: formData.get("in_stock") === "on",
    published: formData.get("published") === "on",
    featured: formData.get("featured") === "on",
  };

  // Prices are minor units and must stay whole. A blank or nonsense box leaves
  // the stored price alone rather than zeroing it.
  if (Number.isFinite(price) && price >= 0) patch.price = Math.round(price);
  patch.compare_at_price = compare && Number.isFinite(Number(compare))
    ? Math.round(Number(compare))
    : null;

  const supabase = createAdminClient();
  await supabase.from("products").update(patch).eq("id", id);

  revalidateTag(CATALOGUE_TAG, { expire: 0 });
  revalidatePath("/admin/products");
}

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
