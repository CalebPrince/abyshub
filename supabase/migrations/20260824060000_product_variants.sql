-- Supplier-listed options such as colours, sizes and shades.
alter table products
  add column if not exists variants text[] not null default '{}';