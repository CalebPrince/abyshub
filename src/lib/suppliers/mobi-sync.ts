import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";

type Db = ReturnType<typeof createAdminClient>;

/**
 * Reconciles the abyshub Tupperware catalogue against the MOBI "Sales Force"
 * portal (amp.tuppafrica.co.za) — the only Tupperware stock actually available.
 *
 * MOBI is behind a consultant login, so this is not an automated importer: a
 * human pastes a catalogue snapshot (the array printed by the browser snippet
 * in scripts/sync-mobi-catalogue.mjs) into the admin, previews the plan, then
 * applies it in chunks.
 *
 * Design notes:
 * - Prices are the MOBI "Recognition" value, 1:1 as cedis (owner's decision).
 * - Images are the MOBI product photo, re-hosted in the bucket. They are
 *   low-res (~200px) — accepted, because the colour is then correct.
 * - `offset` in the chunked apply indexes into the *sorted MOBI rows*, never a
 *   shrinking plan, so re-running a chunk is a harmless no-op.
 */

export const MOBI_IMG_BASE = "https://tupp.tuppafrica.co.za/Images/virtualstore/";
const BUCKET = "product-images";
const BRAND = "Tupperware";
export const MOBI_SUPPLIER = "tuppafrica-mobi";

export type MobiRow = {
  code: string;
  name: string;
  recognition: string;
  priceZAR?: string;
  img: string;
};

/** The product columns this sync needs to reason about. */
export type ExistingRow = {
  id: string;
  slug: string;
  name: string;
  price: number;
  image: string | null;
  in_stock: boolean;
  stock_quantity: number;
  published: boolean;
  supplier: string | null;
  external_sku: string | null;
};

/** Parse and validate a pasted snapshot. Throws with a message fit to show. */
export function parseMobiSnapshot(text: string): MobiRow[] {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("That is not valid JSON. Paste the array the browser snippet prints.");
  }
  if (!Array.isArray(data)) throw new Error("Expected a JSON array of products.");

  const rows: MobiRow[] = [];
  const seen = new Set<string>();
  for (const entry of data) {
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const code = String(o.code ?? "").trim();
    const name = String(o.name ?? "").trim();
    const recognition = String(o.recognition ?? "").trim();
    const img = String(o.img ?? "noimage.png").trim() || "noimage.png";
    if (!/^\d{4,7}$/.test(code) || !name || !/^\d+(\.\d+)?$/.test(recognition)) continue;
    if (seen.has(code)) continue;
    seen.add(code);
    rows.push({
      code,
      name,
      recognition,
      img,
      priceZAR: o.priceZAR ? String(o.priceZAR) : undefined,
    });
  }
  if (rows.length === 0) {
    throw new Error("No usable products in that snapshot — check you copied the whole array.");
  }
  rows.sort((a, b) => a.code.localeCompare(b.code));
  return rows;
}

/** Matches src/app/admin/data-actions.ts slugify(). */
export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Loose key for matching a MOBI name to an existing abyshub name. */
export function normName(s: string) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bedd\b/g, " ")
    .replace(/\btab\b/g, "thats a bowl")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFor(name: string) {
  const n = name.toLowerCase();
  if (/(bottle|tumbler|\bmug\b|flask|\bjar\b|pitcher|\botg\b|on the go|quick shake|infuser|aqua)/.test(n)) return "on-the-go";
  if (/(bowl|plate|server|tray|dish|luncher|lunchbox|lunch box|sandwich|serving|allegra|marinader|luncheon)/.test(n)) return "serveware";
  if (/(knife|scoop|juicer|chopper|spice|cutlery|utensil|popcorn|grater|micro delight|crystalwave|reheatable)/.test(n)) return "kitchen-prep";
  if (/(wipes|glove|dispenser)/.test(n)) return "home-care";
  return "food-storage";
}

const cedis = (recognition: string) => Math.max(1, Math.round(parseFloat(recognition))) * 100;

function matchRow(m: MobiRow, rows: ExistingRow[]) {
  return (
    rows.find((r) => r.supplier === MOBI_SUPPLIER && r.external_sku === m.code) ??
    rows.find((r) => normName(r.name) === normName(m.name))
  );
}

export type RowPlan =
  | { kind: "update"; id: string; slug: string; patch: Record<string, unknown>; mobiCode?: string; mobiImg?: string; reasons: string[] }
  | { kind: "create"; slug: string; product: Record<string, unknown>; mobiCode?: string; mobiImg?: string; warning?: string }
  | { kind: "noop"; slug: string };

/** What one MOBI row implies for the catalogue as it stands right now. */
export function planRow(m: MobiRow, rows: ExistingRow[]): RowPlan {
  const price = cedis(m.recognition);
  const hasImg = Boolean(m.img) && m.img !== "noimage.png";
  const row = matchRow(m, rows);

  if (row) {
    const patch: Record<string, unknown> = {};
    const reasons: string[] = [];
    if (row.price !== price) { patch.price = price; reasons.push(`price ₵${row.price / 100}→₵${price / 100}`); }
    if (!row.in_stock) { patch.in_stock = true; reasons.push("in stock"); }
    if ((row.stock_quantity ?? 0) < 1) { patch.stock_quantity = 1; reasons.push("qty ≥ 1"); }
    if (!row.published) { patch.published = true; reasons.push("listed"); }
    if (row.supplier !== MOBI_SUPPLIER || row.external_sku !== m.code) {
      patch.supplier = MOBI_SUPPLIER;
      patch.external_sku = m.code;
      reasons.push("linked to MOBI");
    }
    const imageIsMobi = (row.image ?? "").includes(`/mobi/${m.code}.`);
    if (hasImg && !imageIsMobi) {
      reasons.push("image ← MOBI");
      return { kind: "update", id: row.id, slug: row.slug, patch, mobiCode: m.code, mobiImg: m.img, reasons };
    }
    if (reasons.length) return { kind: "update", id: row.id, slug: row.slug, patch, reasons };
    return { kind: "noop", slug: row.slug };
  }

  const slug = "tuppafrica-" + slugify(m.name);
  if (rows.some((r) => r.slug === slug || r.id === slug)) {
    return { kind: "noop", slug };
  }
  const product: Record<string, unknown> = {
    id: slug,
    slug,
    name: m.name,
    brand: BRAND,
    price,
    category: categoryFor(m.name),
    in_stock: true,
    stock_quantity: 1,
    published: true,
    supplier: MOBI_SUPPLIER,
    external_sku: m.code,
    imported_at: new Date().toISOString(),
    list_price: Math.round(parseFloat(m.priceZAR ?? m.recognition) * 100),
    list_currency: "ZAR",
    highlights: [],
    variants: [],
    categories: [],
  };
  return {
    kind: "create",
    slug,
    product,
    mobiCode: hasImg ? m.code : undefined,
    mobiImg: hasImg ? m.img : undefined,
    warning: `category guessed as "${product.category}"`,
  };
}

/** In-stock `tuppafrica-*` rows that the snapshot no longer lists. */
export function planDrops(mobiRows: MobiRow[], rows: ExistingRow[]): ExistingRow[] {
  const keep = new Set<string>();
  for (const m of mobiRows) {
    const row = matchRow(m, rows);
    if (row) keep.add(row.id);
  }
  return rows.filter(
    (r) => r.slug.startsWith("tuppafrica-") && r.in_stock && !keep.has(r.id)
  );
}

/** Download a MOBI product photo and (re-)store it in the bucket. Returns its public URL. */
export async function storeMobiImage(supabase: Db, code: string, imgFile: string): Promise<string> {
  const res = await fetch(MOBI_IMG_BASE + imgFile, { signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new Error(`image download ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = (imgFile.split(".").pop() || "jpg").toLowerCase() === "png" ? "png" : "jpg";
  const path = `mobi/${code}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: ext === "png" ? "image/png" : "image/jpeg", upsert: true });
  if (error) throw new Error(error.message);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

export const SELECT_COLUMNS =
  "id, slug, name, price, image, in_stock, stock_quantity, published, supplier, external_sku";
