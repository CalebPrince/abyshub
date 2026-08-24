-- ============================================================================
-- Abys Hub CRM — foundation schema
--
-- Run this once in the Supabase SQL editor (or via `supabase db push`).
--
-- Security model, stated in one place so it is hard to get wrong later:
--   * RLS is on for every table and nothing is readable by default.
--   * The storefront (anon key, in the browser) may read the catalogue, the
--     page copy and the public settings. It may write nothing, ever.
--   * The admin runs server-side through the service role, which bypasses RLS.
--     Signed-in admins also get explicit policies, so the anon key alone can
--     never be used to read the CRM from a browser.
--   * Payment and SMTP credentials live in `secure_settings`, which has no
--     policies at all — service role only — so a leaked anon key cannot
--     expose them.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Who is allowed into the admin
-- ---------------------------------------------------------------------------

-- This table is the allow-list. Having a Supabase auth user is not enough on
-- its own: without a row here, sign-in succeeds but the admin turns them away.
-- That keeps "can authenticate" and "is staff" as two separate facts.
create table if not exists admin_users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

-- Used by the policies below. SECURITY DEFINER so the check is not itself
-- subject to the policies it is being used to evaluate, which would recurse.
create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select exists (select 1 from admin_users where id = auth.uid());
$fn$;

-- ---------------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------------

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  phone text,
  -- Denormalised so the list view can sort and filter without touching orders.
  order_count integer not null default 0,
  total_spent integer not null default 0,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  notes text
);

create index if not exists customers_last_seen_idx on customers (last_seen_at desc);

-- ---------------------------------------------------------------------------
-- Orders
-- ---------------------------------------------------------------------------

-- `reference` is the Paystack transaction reference, and it is unique. That is
-- what makes the webhook idempotent: Paystack retries until it gets a 200, so
-- the handler upserts on this column instead of inserting blindly.
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references customers (id) on delete set null,

  email text not null,
  name text,
  phone text,
  address text,
  city text,

  -- Money is integer minor units (pesewas) throughout, matching lib/money.ts.
  -- Never store money as a float.
  subtotal integer not null default 0,
  delivery integer not null default 0,
  total integer not null default 0,
  currency text not null default 'GHS',

  -- Where the money is: driven by Paystack.
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'paid', 'failed', 'refunded')),
  -- Where the goods are: driven by staff in the admin.
  fulfilment_status text not null default 'new'
    check (fulfilment_status in ('new', 'packing', 'dispatched', 'delivered', 'cancelled')),

  channel text not null default 'card'
    check (channel in ('card', 'whatsapp', 'manual')),
  paid_at timestamptz,
  -- The untouched Paystack event, so a mis-parse is always recoverable.
  raw_payload jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_created_idx on orders (created_at desc);
create index if not exists orders_payment_status_idx on orders (payment_status);
create index if not exists orders_fulfilment_idx on orders (fulfilment_status);

-- Line items are snapshots, not joins onto products: what the customer paid
-- must not change when someone edits a price next month.
create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_id text,
  name text not null,
  unit_price integer not null,
  quantity integer not null check (quantity > 0)
);

create index if not exists order_items_order_idx on order_items (order_id);

-- ---------------------------------------------------------------------------
-- Enquiries / leads
-- ---------------------------------------------------------------------------

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers (id) on delete set null,
  name text not null,
  email text,
  phone text,
  details text not null,
  basket_summary text,
  source text not null default 'enquiry'
    check (source in ('enquiry', 'chat', 'whatsapp', 'manual')),
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'quoted', 'won', 'lost')),
  -- Set when a lead turns into money, so won/lost becomes reportable.
  order_id uuid references orders (id) on delete set null,
  assigned_to uuid references admin_users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists leads_stage_idx on leads (stage);
create index if not exists leads_created_idx on leads (created_at desc);

-- Append-only trail against a lead or a customer.
create table if not exists lead_notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads (id) on delete cascade,
  customer_id uuid references customers (id) on delete cascade,
  author_id uuid references admin_users (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint lead_notes_has_subject check (lead_id is not null or customer_id is not null)
);

create index if not exists lead_notes_lead_idx on lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Catalogue
-- ---------------------------------------------------------------------------

-- Mirrors the Product type in lib/types.ts, so the hardcoded array in
-- lib/products.ts can be retired without rewriting any storefront component.
create table if not exists products (
  id text primary key,
  slug text not null unique,
  name text not null,
  brand text not null,
  tagline text,
  description text,
  price integer not null,
  compare_at_price integer,
  category text not null,
  image text,
  rating numeric(2, 1) default 0,
  review_count integer default 0,
  in_stock boolean not null default true,
  featured boolean not null default false,
  highlights text[] not null default '{}',
  -- Lets staff pull something from the shop without losing its order history.
  published boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_category_idx on products (category);

create table if not exists categories (
  slug text primary key,
  name text not null,
  description text,
  gradient text,
  sort_order integer not null default 0
);

-- ---------------------------------------------------------------------------
-- Editable page copy
-- ---------------------------------------------------------------------------

-- Addressed as page + key, e.g. 'home' / 'hero_heading'. jsonb rather than text
-- so a block can hold a list or a small object without a schema change.
create table if not exists page_content (
  id uuid primary key default gen_random_uuid(),
  page text not null,
  key text not null,
  value jsonb not null,
  label text,
  updated_at timestamptz not null default now(),
  unique (page, key)
);

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------

-- Non-sensitive, and readable by the storefront: WhatsApp number, site URL,
-- delivery thresholds — the things that currently force a redeploy to change.
create table if not exists settings (
  key text primary key,
  value text,
  label text,
  group_name text not null default 'general',
  updated_at timestamptz not null default now()
);

-- Credentials. Deliberately a separate table with NO policies at all, so that
-- even a leaked anon key cannot read it — only the service role can, and that
-- is server-side only. Never select from this into a Client Component.
create table if not exists secure_settings (
  key text primary key,
  value text,
  label text,
  group_name text not null default 'secrets',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $fn$
begin
  new.updated_at = now();
  return new;
end;
$fn$;

do $do$
declare t text;
begin
  foreach t in array array['orders', 'leads', 'products', 'page_content', 'settings', 'secure_settings']
  loop
    execute format('drop trigger if exists %I_touch on %I', t, t);
    execute format(
      'create trigger %I_touch before update on %I for each row execute function touch_updated_at()',
      t, t
    );
  end loop;
end;
$do$;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------

alter table admin_users     enable row level security;
alter table customers       enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table leads           enable row level security;
alter table lead_notes      enable row level security;
alter table products        enable row level security;
alter table categories      enable row level security;
alter table page_content    enable row level security;
alter table settings        enable row level security;
alter table secure_settings enable row level security;

-- Note the absence of any policy on secure_settings. That is the point.

-- The storefront reads these with the anon key. Read-only, published only.
drop policy if exists products_public_read on products;
create policy products_public_read on products
  for select using (published = true);

drop policy if exists categories_public_read on categories;
create policy categories_public_read on categories
  for select using (true);

drop policy if exists page_content_public_read on page_content;
create policy page_content_public_read on page_content
  for select using (true);

drop policy if exists settings_public_read on settings;
create policy settings_public_read on settings
  for select using (true);

-- Signed-in admins get full access to the CRM tables.
do $do$
declare t text;
begin
  foreach t in array array[
    'customers', 'orders', 'order_items', 'leads', 'lead_notes',
    'products', 'categories', 'page_content', 'settings'
  ]
  loop
    execute format('drop policy if exists %I_admin_all on %I', t, t);
    execute format(
      'create policy %I_admin_all on %I for all to authenticated using (is_admin()) with check (is_admin())',
      t, t
    );
  end loop;
end;
$do$;

-- An admin may see the staff list; only the service role may change it, so
-- nobody can promote themselves from a browser.
drop policy if exists admin_users_self_read on admin_users;
create policy admin_users_self_read on admin_users
  for select to authenticated using (is_admin());

-- ---------------------------------------------------------------------------
-- Data API privileges
--
-- PostgREST needs *two* things to allow a read: a GRANT on the table and an
-- RLS policy that permits the row. The policies above are only half of it.
--
-- These grants are written out explicitly so the migration does not depend on
-- the project's "automatically expose new tables" setting — which should be
-- left off, so that access is something this file states rather than something
-- a dashboard toggle decides.
-- ---------------------------------------------------------------------------

-- The storefront, in the browser, with the anon key. Read-only and only the
-- four tables it actually renders from. No insert, update or delete anywhere.
grant select on products, categories, page_content, settings to anon;

-- Signed-in staff. The row-level policies still gate every one of these on
-- is_admin(), so a grant alone opens nothing.
grant select, insert, update, delete on
  customers, orders, order_items, leads, lead_notes,
  products, categories, page_content, settings
to authenticated;

grant select on admin_users to authenticated;

-- The server-side service role. It bypasses RLS, so this is the only grant
-- standing between it and the data — including secure_settings, which
-- deliberately appears in no other grant in this file.
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Belt and braces: revoke any blanket access the API roles may have picked up
-- on the credentials table. anon and authenticated must never read it.
revoke all on secure_settings from anon, authenticated;
