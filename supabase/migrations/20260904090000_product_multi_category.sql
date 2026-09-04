-- A product can sit on more than one shelf.
--
-- `category` stays the primary shelf and is left untouched: it is what the
-- brand hero, the related-products rule and the supplier importers all read,
-- and every existing row already has one. This column holds the additional
-- shelves, so a product with none behaves exactly as it did before.
alter table products add column if not exists categories text[] not null default '{}';
