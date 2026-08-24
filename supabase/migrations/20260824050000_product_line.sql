-- ============================================================================
-- The maker's range, kept out of the name
--
-- Partner titles are written for search engines: "Tupperware® Modular Mates®
-- Square 2 | Food Storage Container 11-cup" names the maker twice before it
-- says what the object is, and that whole string was landing in the product
-- name.
--
-- The branding is worth keeping — a range is what a Tupperware buyer actually
-- shops by — so it is lifted into a column of its own and given its own design
-- on the card and the product page, rather than being deleted or left to crowd
-- the title.
--
-- Not the brand column: that one is a filter facet, and a few hundred distinct
-- ranges in it would turn the brand menu into a list of every product.
-- ============================================================================

alter table products
  add column if not exists product_line text;

comment on column products.product_line is
  'Maker and range as the partner writes it, marks and all, e.g. "Tupperware(R) Modular Mates(R)". Display only.';
