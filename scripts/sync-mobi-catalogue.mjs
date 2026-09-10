/**
 * Make the live abyshub Tupperware catalogue match the MOBI "Sales Force" portal
 * (tuppafrica — https://amp.tuppafrica.co.za), which is the only stock actually
 * available now.
 *
 * MOBI is behind a consultant login, so this cannot run as an automated importer.
 * The workflow is: a human pastes a fresh catalogue snapshot into
 * scripts/mobi-catalogue.json, then runs this script.
 *
 *   HOW TO REFRESH scripts/mobi-catalogue.json
 *   ------------------------------------------
 *   1. Log in to https://amp.tuppafrica.co.za, open Shop -> All Categories.
 *   2. Page through every page; in the browser console run this once per page,
 *      accumulating results, then save the array to scripts/mobi-catalogue.json:
 *
 *        [...document.querySelectorAll('img[src*="virtualstore"]')].map(img=>{
 *          let c=img.closest('div');
 *          for(let i=0;i<8&&c;i++){ if(/Recognition/.test(c.innerText)) break; c=c.parentElement; }
 *          const t=(c?c.innerText:'').replace(/\s+/g,' ').trim();
 *          return {
 *            code:(t.match(/\b(\d{5,6})\b/)||[])[1],
 *            name:(t.match(/\d{5,6}\s+(.+?)\s+Recognition/)||[])[1],
 *            priceZAR:(t.match(/Price:\s*([\d.]+)/)||[])[1],
 *            recognition:(t.match(/Recognition:\s*([\d.]+)/)||[])[1],
 *            img:img.src.split('/').pop(),
 *          };
 *        });
 *
 *   USAGE
 *   -----
 *     export NEXT_PUBLIC_SUPABASE_URL=...            # same value Vercel uses
 *     export SUPABASE_SERVICE_ROLE_KEY=...           # the service-role / secret key
 *
 *     node scripts/sync-mobi-catalogue.mjs              # dry run — prints the plan, writes nothing
 *     node scripts/sync-mobi-catalogue.mjs --apply      # actually write
 *     node scripts/sync-mobi-catalogue.mjs --apply --skip-create   # update existing only, don't create new rows
 *
 *   WHAT IT DOES  (Tupperware / MOBI rows only — Oriflame and the old catalogue
 *   are already out of stock and are never touched)
 *     price  -> MOBI "Recognition" value, taken 1:1 as cedis (owner's decision)
 *     image  -> the MOBI product photo, downloaded and re-hosted in the
 *               product-images bucket. These are low-res (~200px); that is
 *               accepted in exchange for the colour being correct. A MOBI entry
 *               with no photo leaves the existing abyshub image alone.
 *     stock  -> in_stock = true, stock_quantity >= 1, published = true
 *     create -> MOBI products with no abyshub match are inserted, in stock
 *     drop   -> in-stock `tuppafrica-*` rows that MOBI no longer lists are set
 *               out of stock (kept, not deleted — order history stays intact)
 *
 *   After a successful run the storefront picks up the changes within the
 *   catalogue cache TTL (1 hour), or immediately if someone saves anything in
 *   the admin (that fires updateTag(CATALOGUE_TAG)).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const HERE = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");
const SKIP_CREATE = process.argv.includes("--skip-create");

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "").trim();
const SERVICE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_SECRET_KEY).");
  process.exit(1);
}

const BUCKET = "product-images";
const MOBI_IMG_BASE = "https://tupp.tuppafrica.co.za/Images/virtualstore/";
const BRAND = "Tupperware";
const SUPPLIER = "tuppafrica-mobi";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// --- helpers ---------------------------------------------------------------

/** Matches src/app/admin/data-actions.ts slugify(). */
function slugify(value) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-");
}

/** Loose key for matching MOBI names against existing abyshub names. */
function normName(s) {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bedd\b/g, " ")
    .replace(/\btab\b/g, "thats a bowl")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function categoryFor(name) {
  const n = name.toLowerCase();
  if (/(bottle|tumbler|mug|flask|\bjar\b|pitcher|\botg\b|on the go|quick shake|infuser|aqua)/.test(n)) return "on-the-go";
  if (/(bowl|plate|server|tray|dish|luncher|lunchbox|lunch box|sandwich|serving|allegra|marinader|luncheon)/.test(n)) return "serveware";
  if (/(knife|scoop|juicer|chopper|spice|cutlery|utensil|popcorn|grater|press|baking)/.test(n)) return "kitchen-prep";
  if (/(wipes|glove|dispenser)/.test(n)) return "home-care";
  return "food-storage"; // canisters, storers, keepers, silicone bags, snack boxes, fridge mates …
}

const cedis = (recognition) => Math.max(1, Math.round(parseFloat(recognition))) * 100; // minor units

async function uploadMobiImage(code, imgFile) {
  const src = MOBI_IMG_BASE + imgFile;
  const res = await fetch(src);
  if (!res.ok) throw new Error(`download ${src} -> ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ext = (imgFile.split(".").pop() || "jpg").toLowerCase();
  const contentType = ext === "png" ? "image/png" : "image/jpeg";
  const path = `mobi/${code}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, buf, { contentType, upsert: true });
  if (error) throw new Error(`upload ${path} -> ${error.message}`);
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

// --- load ------------------------------------------------------------------

const mobi = JSON.parse(readFileSync(join(HERE, "mobi-catalogue.json"), "utf8"))
  .filter((m) => m.code && m.name && m.recognition);

console.log(`MOBI snapshot: ${mobi.length} products`);
console.log(APPLY ? "MODE: APPLY (writing)\n" : "MODE: dry run (no writes) — pass --apply to write\n");

const { data: rows, error } = await supabase
  .from("products")
  .select("id, slug, name, brand, price, image, in_stock, stock_quantity, published, category, supplier, external_sku");
if (error) throw error;
console.log(`abyshub: ${rows.length} products total`);

const bySku = new Map(rows.filter((r) => r.supplier === SUPPLIER && r.external_sku).map((r) => [r.external_sku, r]));
const byName = new Map();
for (const r of rows) if (!byName.has(normName(r.name))) byName.set(normName(r.name), r);

// --- plan ----------------------------------------------------------------

const updates = []; // { row, patch, reasons[] }
const creates = []; // { m, product }
const matchedIds = new Set();
const warnings = [];

for (const m of mobi) {
  const row = bySku.get(m.code) || byName.get(normName(m.name));
  const price = cedis(m.recognition);
  const hasImg = m.img && m.img !== "noimage.png";

  if (row) {
    matchedIds.add(row.id);
    if (!bySku.has(m.code) && row.name.toLowerCase() !== m.name.toLowerCase())
      warnings.push(`name-matched (verify): MOBI "${m.name}" -> abyshub "${row.name}" (${row.slug})`);
    const patch = {};
    const reasons = [];
    if (row.price !== price) { patch.price = price; reasons.push(`price ${row.price / 100}->${price / 100}`); }
    if (!row.in_stock) { patch.in_stock = true; reasons.push("in_stock"); }
    if ((row.stock_quantity ?? 0) < 1) { patch.stock_quantity = Math.max(1, row.stock_quantity ?? 0); reasons.push("qty>=1"); }
    if (!row.published) { patch.published = true; reasons.push("published"); }
    if (row.supplier !== SUPPLIER || row.external_sku !== m.code) { patch.supplier = SUPPLIER; patch.external_sku = m.code; reasons.push("stamp sku"); }
    if (hasImg) { patch.__mobiImg = m.img; patch.__mobiCode = m.code; reasons.push("image<-MOBI"); }
    if (reasons.length) updates.push({ row, patch, reasons });
  } else if (!SKIP_CREATE) {
    const slug = "tuppafrica-" + slugify(m.name);
    if (rows.some((r) => r.slug === slug || r.id === slug)) {
      warnings.push(`slug clash, skipping create: ${slug} (MOBI "${m.name}")`);
      continue;
    }
    creates.push({
      m,
      product: {
        id: slug,
        slug,
        name: m.name,
        brand: BRAND,
        price,
        category: categoryFor(m.name),
        in_stock: true,
        stock_quantity: 1,
        published: true,
        supplier: SUPPLIER,
        external_sku: m.code,
        imported_at: new Date().toISOString(),
        list_price: Math.round(parseFloat(m.priceZAR || m.recognition) * 100),
        list_currency: "ZAR",
        highlights: [],
        variants: [],
        categories: [],
        __mobiImg: hasImg ? m.img : null,
        __mobiCode: m.code,
      },
    });
  }
}

const drop = rows.filter(
  (r) => r.slug.startsWith("tuppafrica-") && r.in_stock && !matchedIds.has(r.id)
);

// --- report ------------------------------------------------------------------

console.log(`\nPLAN`);
console.log(`  update existing : ${updates.length}`);
console.log(`  create new      : ${creates.length}${SKIP_CREATE ? " (skipped: --skip-create)" : ""}`);
console.log(`  set out of stock: ${drop.length}`);
if (warnings.length) {
  console.log(`\nWARNINGS (${warnings.length}) — check these before --apply:`);
  warnings.forEach((w) => console.log("  ! " + w));
}
console.log(`\n-- updates --`);
updates.forEach((u) => console.log(`  ${u.row.slug}: ${u.reasons.join(", ")}`));
console.log(`\n-- creates --`);
creates.forEach((c) => console.log(`  ${c.product.slug}  [${c.m.code}]  GH₵${c.product.price / 100}  ${c.product.category}  img:${c.product.__mobiImg || "none"}`));
console.log(`\n-- out of stock --`);
drop.forEach((d) => console.log(`  ${d.slug}  (${d.name})`));

if (!APPLY) {
  console.log(`\nDry run complete. Re-run with --apply to write.`);
  process.exit(0);
}

// --- apply ------------------------------------------------------------------

let ok = 0, fail = 0;

for (const u of updates) {
  const patch = { ...u.patch };
  const imgFile = patch.__mobiImg, code = patch.__mobiCode;
  delete patch.__mobiImg; delete patch.__mobiCode;
  try {
    if (imgFile) patch.image = await uploadMobiImage(code, imgFile);
    if (Object.keys(patch).length) {
      const { error: e } = await supabase.from("products").update(patch).eq("id", u.row.id);
      if (e) throw e;
    }
    ok++; console.log(`  updated ${u.row.slug}`);
  } catch (e) { fail++; console.error(`  FAIL ${u.row.slug}: ${e.message}`); }
}

for (const c of creates) {
  const product = { ...c.product };
  const imgFile = product.__mobiImg, code = product.__mobiCode;
  delete product.__mobiImg; delete product.__mobiCode;
  try {
    if (imgFile) product.image = await uploadMobiImage(code, imgFile);
    const { error: e } = await supabase.from("products").insert(product);
    if (e) throw e;
    ok++; console.log(`  created ${product.slug}`);
  } catch (e) { fail++; console.error(`  FAIL create ${product.slug}: ${e.message}`); }
}

if (drop.length) {
  const ids = drop.map((d) => d.id);
  const { error: e } = await supabase
    .from("products")
    .update({ in_stock: false, stock_quantity: 0 })
    .in("id", ids);
  if (e) { fail++; console.error(`  FAIL out-of-stock batch: ${e.message}`); }
  else { ok += drop.length; console.log(`  set ${drop.length} out of stock`); }
}

console.log(`\nDone. ${ok} ok, ${fail} failed.`);
console.log(`Storefront refreshes within 1h (catalogue TTL), or immediately after any admin save.`);
process.exit(fail ? 1 : 0);
