-- Storefront analytics, first party.
--
-- The shop tells visitors it loads no third-party trackers, and that stays
-- true: these rows are written by our own API route into our own database and
-- go nowhere else. Nothing here identifies a person. The session id is a
-- random value the browser keeps for the tab and throws away on close, which
-- is enough to follow one visit through the funnel and no use for anything
-- afterwards.
create table if not exists site_events (
  id bigint generated always as identity primary key,
  -- Per visit, not per person. Lets one journey be reconstructed without
  -- knowing whose it was.
  session_id text not null,
  name text not null,
  path text,
  -- Where the visit came from, carried on every row of the session so a funnel
  -- can be cut by source without a join back to the first event.
  source text,
  medium text,
  campaign text,
  referrer_host text,
  -- Whichever of these the event is about.
  product_slug text,
  search_term text,
  method text,
  -- Minor units, for the events that carry a basket.
  value integer,
  created_at timestamptz not null default now()
);

create index if not exists site_events_created_idx on site_events(created_at desc);
create index if not exists site_events_name_idx on site_events(name, created_at desc);
create index if not exists site_events_session_idx on site_events(session_id, created_at);

alter table site_events enable row level security;

-- Written only through the API route, which runs as the service role, and read
-- only by the back office. No anon policy: a public insert path would let
-- anyone forge the shop's own numbers, and a read path would hand out the
-- browsing history of every visitor.
revoke all on site_events from anon, authenticated;
grant all on site_events to service_role;
