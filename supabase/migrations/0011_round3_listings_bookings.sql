-- Round 3 schema: comprehensive listing detail, the booking flow, roommate grouping,
-- checklist categories, persisted offer finance inputs, and a cost-of-living index.

-- RB31 - comprehensive listing detail columns (all nullable; backfilled below).
alter table public.listings
  add column if not exists furnished boolean,
  add column if not exists pros text[] not null default '{}',
  add column if not exists bedrooms integer,
  add column if not exists bathrooms numeric(3, 1),
  add column if not exists sqft integer,
  add column if not exists amenities text[] not null default '{}',
  add column if not exists utilities_included boolean;

alter table public.listings
  drop constraint if exists listings_bedrooms_nonneg,
  add constraint listings_bedrooms_nonneg check (bedrooms is null or bedrooms >= 0),
  drop constraint if exists listings_bathrooms_nonneg,
  add constraint listings_bathrooms_nonneg check (bathrooms is null or bathrooms >= 0),
  drop constraint if exists listings_sqft_positive,
  add constraint listings_sqft_positive check (sqft is null or sqft > 0);

-- Backfill sensible, deterministic values for rows that predate these columns
-- (seeded and sourced rows). Uses hashtext(id) so the same row is stable across runs.
update public.listings set
  furnished = coalesce(furnished, (abs(hashtext(id::text || 'furn')) % 3) <> 0),
  bedrooms = coalesce(bedrooms, 1 + (abs(hashtext(id::text || 'bed')) % 3)),
  bathrooms = coalesce(bathrooms, (1.0 + (abs(hashtext(id::text || 'bath')) % 2))::numeric(3, 1)),
  sqft = coalesce(sqft, 450 + (abs(hashtext(id::text || 'sqft')) % 12) * 50),
  utilities_included = coalesce(utilities_included, (abs(hashtext(id::text || 'util')) % 2) = 0)
where furnished is null
   or bedrooms is null
   or bathrooms is null
   or sqft is null
   or utilities_included is null;

update public.listings set
  amenities = case (abs(hashtext(id::text || 'amen')) % 3)
    when 0 then array['wifi', 'in_unit_laundry', 'dishwasher']
    when 1 then array['wifi', 'gym', 'rooftop']
    else array['wifi', 'parking', 'ac']
  end
where amenities = '{}';

update public.listings set
  pros = case (abs(hashtext(id::text || 'pros')) % 3)
    when 0 then array['Short walk to transit', 'Quiet street', 'Flexible move-in']
    when 1 then array['Bright and airy', 'Close to coffee', 'Great for interns']
    else array['Furnished and move-in ready', 'Utilities simple', 'Near the office']
  end
where pros = '{}';

-- RB32 - bookings table + deterministic state machine (policies live in 0012).
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  booker_id uuid not null references public.users (id) on delete cascade,
  roommate_ids uuid[] not null default '{}',
  roommate_invites uuid[] not null default '{}',
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'booked', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create index if not exists idx_bookings_listing on public.bookings (listing_id);
create index if not exists idx_bookings_booker on public.bookings (booker_id);
create index if not exists idx_bookings_status on public.bookings (status);
create index if not exists idx_bookings_roommates on public.bookings using gin (roommate_ids);

-- At most one live (non-terminal) booking hold per listing keeps the state machine honest.
create unique index if not exists bookings_one_live_hold_per_listing
  on public.bookings (listing_id)
  where status in ('requested', 'approved', 'booked');

-- RB35 - optional checklist grouping category.
alter table public.checklist_items
  add column if not exists category text;

alter table public.checklist_items
  drop constraint if exists checklist_items_category_check,
  add constraint checklist_items_category_check
    check (category is null or category in ('travel', 'logistics', 'packing', 'admin'));

-- RB34 - persisted finance inputs on the user (all nullable; owner-updatable).
-- The offer parser (Person C) fills stipend/bonus; onboarding persists salary/city.
alter table public.users
  add column if not exists offer_salary integer,
  add column if not exists relocation_stipend integer,
  add column if not exists signing_bonus integer;

alter table public.users
  drop constraint if exists users_offer_salary_nonneg,
  add constraint users_offer_salary_nonneg check (offer_salary is null or offer_salary >= 0),
  drop constraint if exists users_relocation_stipend_nonneg,
  add constraint users_relocation_stipend_nonneg check (relocation_stipend is null or relocation_stipend >= 0),
  drop constraint if exists users_signing_bonus_nonneg,
  add constraint users_signing_bonus_nonneg check (signing_bonus is null or signing_bonus >= 0);

-- RB34 - cost-of-living index table (Person B owns the schema; Person C may back a
-- richer lookup with it). 100 = national average.
create table if not exists public.cost_of_living (
  city text primary key,
  index numeric(6, 1) not null,
  median_rent integer not null,
  updated_at timestamptz not null default now()
);

insert into public.cost_of_living (city, index, median_rent) values
  ('Seattle', 152.0, 2100),
  ('San Francisco', 178.0, 2900),
  ('Austin', 103.0, 1650),
  ('New York', 187.0, 3200),
  ('National', 100.0, 1450)
on conflict (city) do update set
  index = excluded.index,
  median_rent = excluded.median_rent,
  updated_at = now();
