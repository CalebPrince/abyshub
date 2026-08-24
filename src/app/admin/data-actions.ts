"use server";

import { revalidatePath } from "next/cache";

import { requireAdmin } from "@/lib/admin/dal";
import { createAdminClient, adminClientAvailable } from "@/lib/supabase/admin";
import { products as catalogue, categories } from "@/lib/products";

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

  revalidatePath("/admin/content");
  // The shop reads this copy, so its pages are stale until they rebuild.
  revalidatePath("/", "layout");
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

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
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

  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
}
