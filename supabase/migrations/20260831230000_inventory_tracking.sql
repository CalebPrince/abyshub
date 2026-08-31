-- Counted inventory. Existing available rows start at one so this migration
-- never empties a live shop; staff replace that placeholder with the real
-- physical count from the Products screen.
alter table products add column if not exists stock_quantity integer not null default 0;
alter table products drop constraint if exists products_stock_quantity_check;
alter table products add constraint products_stock_quantity_check check (stock_quantity >= 0);
update products set stock_quantity = case when in_stock then 1 else 0 end
where stock_quantity = 0;

-- Paystack retries successful-charge webhooks. This timestamp makes the stock
-- side effect idempotent independently of the order upsert.
alter table orders add column if not exists inventory_deducted_at timestamptz;

create table if not exists inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  order_id uuid references orders(id) on delete set null,
  delta integer not null check (delta <> 0),
  reason text not null check (reason in ('manual_adjustment', 'sale')),
  created_at timestamptz not null default now()
);

create index if not exists inventory_movements_product_idx
  on inventory_movements(product_id, created_at desc);

alter table inventory_movements enable row level security;
revoke all on inventory_movements from anon, authenticated;
grant all on inventory_movements to service_role;

-- Called only after a verified payment has been written with its line items.
-- The order row and each product row are locked so simultaneous webhooks cannot
-- sell the same units twice or take a count below zero.
create or replace function deduct_inventory_for_paid_order(p_order_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  already_done timestamptz;
  line record;
  current_quantity integer;
  next_quantity integer;
begin
  select inventory_deducted_at into already_done
  from orders where id = p_order_id for update;

  if already_done is not null then return; end if;

  for line in
    select product_id, sum(quantity)::integer as quantity
    from order_items
    where order_id = p_order_id and product_id is not null
    group by product_id
  loop
    select stock_quantity into current_quantity
    from products where id = line.product_id for update;

    if found then
      next_quantity := greatest(current_quantity - line.quantity, 0);
      update products
      set stock_quantity = next_quantity, in_stock = next_quantity > 0
      where id = line.product_id;

      if next_quantity <> current_quantity then
        insert into inventory_movements(product_id, order_id, delta, reason)
        values (line.product_id, p_order_id, next_quantity - current_quantity, 'sale');
      end if;
    end if;
  end loop;

  update orders set inventory_deducted_at = now() where id = p_order_id;
end;
$fn$;

revoke all on function deduct_inventory_for_paid_order(uuid) from public, anon, authenticated;
grant execute on function deduct_inventory_for_paid_order(uuid) to service_role;
