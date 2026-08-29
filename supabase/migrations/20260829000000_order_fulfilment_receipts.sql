-- How an order reaches the customer, plus the code staff verify on handover.
alter table orders
  add column if not exists fulfilment_method text not null default 'delivery'
    check (fulfilment_method in ('delivery', 'pickup')),
  add column if not exists collection_code text;

create unique index if not exists orders_collection_code_unique
  on orders (collection_code)
  where collection_code is not null;
