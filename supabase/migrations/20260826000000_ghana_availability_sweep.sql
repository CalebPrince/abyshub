-- Neither Tupperware's nor Oriflame's pages say anything about Ghana
-- availability, so every product that came from a scrape is unconfirmed for
-- Ghana until staff actually check the real channel (see each supplier's
-- ghanaCheck note in src/lib/suppliers/registry.ts). New imports already land
-- this way; this sweeps everything imported before that changed.
--
-- Hand-added products (supplier is null) are untouched — staff vouched for
-- those directly, not by scraping a partner's page.
update products
set in_stock = false
where supplier is not null;
