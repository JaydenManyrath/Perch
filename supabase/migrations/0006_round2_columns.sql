-- Round 2 core columns: user roles, listing freshness/provenance, event integration metadata.

alter table public.users
  add column if not exists user_type text not null default 'intern';

alter table public.users
  drop constraint if exists users_user_type_check,
  add constraint users_user_type_check check (user_type in ('intern', 'subletter'));

alter table public.listings
  add column if not exists status text,
  add column if not exists expires_at timestamptz,
  add column if not exists last_confirmed_at timestamptz,
  add column if not exists sourced boolean,
  add column if not exists source_name text,
  add column if not exists source_url text,
  add column if not exists external_id text;

update public.listings
set
  status = coalesce(status, 'available'),
  expires_at = coalesce(expires_at, now() + interval '7 days'),
  sourced = coalesce(sourced, false),
  source_name = coalesce(nullif(source_name, ''), nullif(source, ''), 'seed')
where status is null
   or expires_at is null
   or sourced is null
   or source_name is null
   or source_name = '';

alter table public.listings
  alter column status set not null,
  alter column expires_at set not null,
  alter column sourced set not null,
  alter column source_name set not null;

alter table public.listings
  drop constraint if exists listings_status_check,
  add constraint listings_status_check check (status in ('available', 'pending', 'taken', 'stale'));

create unique index if not exists listings_source_name_external_id_unique
  on public.listings (source_name, external_id)
  where external_id is not null;

create index if not exists idx_listings_freshness on public.listings (status, expires_at);
create index if not exists idx_listings_source_lookup on public.listings (source_name, external_id);
create index if not exists idx_listings_sourced on public.listings (sourced);

alter table public.events
  add column if not exists external_id text,
  add column if not exists url text,
  add column if not exists venue text,
  add column if not exists image_url text,
  add column if not exists price_range text;

create unique index if not exists events_source_external_id_unique
  on public.events (source, external_id)
  where external_id is not null;

create index if not exists idx_events_source_lookup on public.events (source, external_id);
