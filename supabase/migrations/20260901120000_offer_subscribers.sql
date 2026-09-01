-- People who asked to be told about discounts.
--
-- Separate from customers and leads on purpose: this is a marketing list, and
-- consent to be emailed offers is not the same thing as having once bought
-- something. Keeping it apart means the list can be exported, or someone
-- removed from it, without touching the order history.
create table if not exists offer_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  -- Signing up twice is not an error and must not overwrite the original date,
  -- so the address is unique in a normalised form and repeat sign-ups are
  -- ignored rather than upserted.
  email_key text not null generated always as (lower(btrim(email))) stored,
  source text not null default 'welcome_modal',
  created_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

create unique index if not exists offer_subscribers_email_key_idx
  on offer_subscribers(email_key);

alter table offer_subscribers enable row level security;

-- Written only by the server action, which runs as the service role. No anon
-- insert policy: a public insert path would let anyone fill the table, and
-- read access would hand the whole mailing list to the browser.
revoke all on offer_subscribers from anon, authenticated;
grant all on offer_subscribers to service_role;
