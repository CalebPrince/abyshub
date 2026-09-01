-- Extra product photographs.
--
-- `image` stays the primary shot: it is what the cards, the cart, the emails
-- and the OpenGraph tag all read, and every existing row already has one.
-- These are the additional angles shown beneath it on the product page, so a
-- product with none behaves exactly as it did before.
alter table products add column if not exists images text[] not null default '{}';
