-- Lisa's memory. One row per conversation, on whichever channel it arrived.
--
-- The transcript is a JSON array rather than a messages table: it is only ever
-- read and written whole, always for one session, and never queried across
-- conversations. A table of rows would buy joins nothing here uses and cost a
-- round trip on every reply.
create table if not exists chat_sessions (
  id uuid primary key default gen_random_uuid(),
  -- Stable handle for the conversation: "whatsapp:+233…" for WhatsApp, or a
  -- random browser token for live chat. Unique so a returning visitor lands
  -- back on their own history instead of starting again.
  token text not null unique,
  channel text not null default 'web'
    check (channel in ('web', 'whatsapp', 'voice')),
  client_name text,
  client_phone text,
  transcript_json jsonb not null default '[]'::jsonb,
  -- Set when Lisa hands over to a person, so staff can find the ones waiting.
  needs_human boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists chat_sessions_updated_idx
  on chat_sessions (updated_at desc);

create index if not exists chat_sessions_needs_human_idx
  on chat_sessions (updated_at desc)
  where needs_human;

-- No policies, deliberately. Transcripts hold whatever a customer typed —
-- phone numbers, addresses, what they are buying and for whom — so they are
-- reachable only through the service role, the same footing as secure_settings.
alter table chat_sessions enable row level security;
