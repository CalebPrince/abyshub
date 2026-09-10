# scripts/

Operational scripts. Not part of the app build or the Vercel deployment.

## sync-mobi-catalogue.mjs

Brings the live abyshub Tupperware catalogue in line with the **MOBI "Sales
Force" portal** (`amp.tuppafrica.co.za`) — the only Tupperware stock actually
available now. Oriflame and the old hardcoded-era products are already out of
stock and are never touched.

MOBI sits behind a consultant login, so this is **not** an automated importer:
a human refreshes `scripts/mobi-catalogue.json` from a browser session, then runs
the script. The header comment in `sync-mobi-catalogue.mjs` has the exact
console snippet for pulling a fresh snapshot.

```bash
export NEXT_PUBLIC_SUPABASE_URL=...          # same value Vercel uses
export SUPABASE_SERVICE_ROLE_KEY=...         # service-role / secret key

node scripts/sync-mobi-catalogue.mjs             # dry run — prints the plan, writes nothing
node scripts/sync-mobi-catalogue.mjs --apply     # write
node scripts/sync-mobi-catalogue.mjs --apply --skip-create   # update/unstock only, no new rows
```

Per run it: sets each price to the MOBI "Recognition" value 1:1 as cedis;
replaces each image with the MOBI product photo (low-res, but the right
colour — an explicit trade); marks all 101 in stock and published; creates the
MOBI products missing from abyshub; and sets any in-stock `tuppafrica-*` row
MOBI has dropped to out of stock (kept, not deleted).

Re-running is safe — it's idempotent. The storefront reflects changes within the
1-hour catalogue cache TTL, or immediately after any admin save.
