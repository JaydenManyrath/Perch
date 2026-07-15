-- 0001_core_tables.sql — B1
-- All 8 tables from FOUNDATION-CONTRACT §2, exact column names + types.
-- `supabase db reset` applies this first. Nullability adjusted at migration time per
-- the contract note; names are the frozen seam and must not drift.

create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ============================================================ users
-- id = auth.users.id (identity; FK target for everything).
create table if not exists public.users (
  id            uuid primary key references auth.users (id) on delete cascade,
  name          text        not null,
  company       text,
  role          text,
  city          text,
  move_in_date  date,
  taste_profile jsonb       not null default '{}'::jsonb,
  verified      boolean     not null default false,   -- "banded" (B3, seeded)
  avatar_url    text,
  created_at    timestamptz not null default now()
);

-- ============================================================ listings (perches)
create table if not exists public.listings (
  id           uuid primary key default gen_random_uuid(),
  title        text        not null,
  address      text,
  lat          double precision,
  lng          double precision,
  price        integer     not null,                  -- USD/mo; deterministic budget math (B10)
  lease_start  date,
  lease_end    date,
  lease_type   text        check (lease_type in ('sublet','short_term','standard')),
  source       text,
  photos       text[]      not null default '{}',     -- Storage refs (bucket listing-photos)
  safety_flags jsonb       not null default '{"scamSignals":[],"notes":[]}'::jsonb,
  created_by   uuid        references public.users (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ============================================================ stickers (POSITIVE only)
create table if not exists public.stickers (
  id         uuid primary key default gen_random_uuid(),
  lat        double precision not null,
  lng        double precision not null,
  category   text        not null
             check (category in
               ('good_coffee','safe_feeling','interns_hang','good_vibe','great_food','green_space')),
  note       text,
  created_by uuid        not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on constraint stickers_category_check on public.stickers is
  'Positive/vibe categories ONLY — no avoid/unsafe labels ever (CLAUDE.md §8, contract §2).';

-- ============================================================ conversations
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  participant_ids uuid[]      not null,               -- length 2 for demo; RLS keys on this
  last_message_at timestamptz,
  created_at      timestamptz not null default now(),
  constraint conversations_two_participants check (array_length(participant_ids, 1) = 2)
);

-- ============================================================ messages (Realtime subscribes)
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid        not null references public.conversations (id) on delete cascade,
  sender_id       uuid        not null references public.users (id) on delete cascade,
  recipient_id    uuid        not null references public.users (id) on delete cascade,
  body            text        not null,
  created_at      timestamptz not null default now()
);

-- ============================================================ events (seeded)
create table if not exists public.events (
  id       uuid primary key default gen_random_uuid(),
  title    text        not null,
  category text        not null,
  lat      double precision,
  lng      double precision,
  datetime timestamptz not null,
  source   text
);

-- ============================================================ notes (past-intern Q&A)
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  city       text        not null,
  area       text,
  topic      text        not null,
  body       text        not null,
  created_by uuid        not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

-- ============================================================ checklist_items (pre-flight)
create table if not exists public.checklist_items (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid        not null references public.users (id) on delete cascade,
  label      text        not null,
  due_offset integer     not null default 0,          -- days before move_in
  done       boolean     not null default false
);
