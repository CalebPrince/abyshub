-- ============================================================================
-- Customer accounts
--
-- Until now Supabase Auth served staff only, and `authenticated` effectively
-- meant "admin". That stops being true here: customers sign in too, so every
-- rule below has to say which kind of authenticated user it means.
--
-- The admin policies from the first migration are untouched and still gate on
-- is_admin(). These are additional, permissive, SELECT-only policies — Postgres
-- ORs permissive policies together, so an admin still sees everything and a
-- customer sees only their own rows.
-- ============================================================================

-- A customer record can now belong to a login. Nullable: guest and staff-
-- entered orders still create customers with no account behind them.
alter table customers
  add column if not exists user_id uuid unique references auth.users (id) on delete set null;

create index if not exists customers_user_idx on customers (user_id);

-- ---------------------------------------------------------------------------
-- Identity helper
-- ---------------------------------------------------------------------------

-- The current user's email, but *only once they have confirmed it*.
--
-- This is the hinge the whole "show me my past guest orders" feature turns on.
-- Matching orders on an unconfirmed address would let anyone register a
-- stranger's email and read their order history and delivery address, so the
-- confirmation check lives here in the database rather than resting on a
-- dashboard setting that someone could switch off later.
--
-- SECURITY DEFINER because auth.users is not readable by `authenticated`.
create or replace function auth_confirmed_email()
returns text
language sql
stable
security definer
set search_path = public, auth
as $fn$
  select lower(u.email)
  from auth.users u
  where u.id = auth.uid()
    and u.email_confirmed_at is not null
$fn$;

revoke all on function auth_confirmed_email() from public;
grant execute on function auth_confirmed_email() to authenticated;

-- ---------------------------------------------------------------------------
-- What a customer may see
-- ---------------------------------------------------------------------------

-- Their own customer record: by account link, or by confirmed email for the
-- record a guest order created before they signed up.
drop policy if exists customers_self_read on customers;
create policy customers_self_read on customers
  for select to authenticated
  using (
    user_id = auth.uid()
    or (email is not null and email = auth_confirmed_email())
  );

-- They may correct their own details, but only on a record already linked to
-- their account — never one merely matching an email.
drop policy if exists customers_self_update on customers;
create policy customers_self_update on customers
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Their own orders. Read-only: there is no customer INSERT or UPDATE policy on
-- orders anywhere, so the only writer remains the service role in the Paystack
-- webhook. A customer cannot mark their own order as paid.
drop policy if exists orders_self_read on orders;
create policy orders_self_read on orders
  for select to authenticated
  using (
    email = auth_confirmed_email()
    or customer_id in (select id from customers where user_id = auth.uid())
  );

drop policy if exists order_items_self_read on order_items;
create policy order_items_self_read on order_items
  for select to authenticated
  using (
    order_id in (
      select id from orders
      where email = auth_confirmed_email()
         or customer_id in (select id from customers where user_id = auth.uid())
    )
  );

-- Note what is deliberately absent: no customer policy on leads, lead_notes,
-- admin_users, settings or secure_settings. A signed-in customer reaching for
-- any of those gets nothing back.
