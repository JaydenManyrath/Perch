-- Round 2 core social tables.

create table if not exists public.listing_swipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  direction text not null check (direction in ('left', 'right')),
  created_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  subject_type text not null check (subject_type in ('listing', 'subletter')),
  subject_id uuid not null,
  reviewer_id uuid not null references public.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  unique (subject_type, subject_id, reviewer_id)
);

create table if not exists public.event_attendance (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create index if not exists idx_listing_swipes_user on public.listing_swipes (user_id);
create index if not exists idx_listing_swipes_listing on public.listing_swipes (listing_id);
create index if not exists idx_listing_swipes_direction on public.listing_swipes (direction);

create index if not exists idx_reviews_subject on public.reviews (subject_type, subject_id);
create index if not exists idx_reviews_reviewer on public.reviews (reviewer_id);

create index if not exists idx_event_attendance_event on public.event_attendance (event_id);
create index if not exists idx_event_attendance_user on public.event_attendance (user_id);
