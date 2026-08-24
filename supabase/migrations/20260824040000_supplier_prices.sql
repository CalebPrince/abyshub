-- ============================================================================
-- What the partner was asking for it
--
-- A product row already remembers where it came from. It did not remember the
-- price on that page, so every import landed at zero and someone had to open
-- the partner's site again to find out what to charge.
--
-- Their figure is kept beside ours, in their currency, so a shelf price can be
-- derived once at import and re-derived later without re-fetching the page —
-- and so a refresh can notice their price moved without touching ours.
-- ============================================================================

alter table products
  -- Minor units of list_currency, matching how price is held in pesewas.
  add column if not exists list_price integer,
  add column if not exists list_currency text;

comment on column products.list_price is
  'The partner''s own price in minor units of list_currency. Reference only: it is never what a customer is charged.';
