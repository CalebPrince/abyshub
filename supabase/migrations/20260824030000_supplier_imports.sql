-- ============================================================================
-- Where a product came from
--
-- Products used to be either hand-entered or copied out of the code. With more
-- than one partner brand feeding the catalogue, a row has to remember its
-- origin — otherwise re-importing a supplier's page creates a second copy of a
-- product we already sell, and there is no way to refresh a description
-- without hunting for the right row by hand.
-- ============================================================================

alter table products
  add column if not exists supplier text,
  add column if not exists source_url text,
  add column if not exists external_sku text,
  add column if not exists imported_at timestamptz;

-- The pair that identifies a supplier's product for the rest of its life. It
-- is what turns a second import into an update instead of a duplicate.
--
-- Partial, because hand-entered products have no supplier and there may be any
-- number of those; a plain unique index would let only one exist.
create unique index if not exists products_supplier_sku_idx
  on products (supplier, external_sku)
  where supplier is not null and external_sku is not null;

create index if not exists products_supplier_idx on products (supplier);

-- ---------------------------------------------------------------------------
-- Categories for the ranges the kitchen taxonomy has nowhere to put
-- ---------------------------------------------------------------------------

-- The shop was built around Tupperware, so every category is a kind of
-- container. A beauty partner needs shelves of its own, or every lipstick
-- lands in "Food Storage".
insert into categories (slug, name, description, sort_order) values
  ('skincare',      'Skincare',      'Cleansers, serums and creams for face and body.', 10),
  ('bath-body',     'Bath & Body',   'Washes, lotions and everyday personal care.',     11),
  ('makeup',        'Makeup',        'Colour for face, eyes, lips and nails.',          12),
  ('fragrance',     'Fragrance',     'Scents for her and for him.',                     13),
  ('hair',          'Hair',          'Shampoos, conditioners and styling.',             14),
  ('wellness',      'Wellness',      'Supplements and everyday wellbeing.',             15)
on conflict (slug) do nothing;
