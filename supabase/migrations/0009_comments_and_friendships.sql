-- Round 2 comments + canonical Friendships.

alter table public.notes
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  alter column city drop not null;

alter table public.notes
  drop constraint if exists notes_coordinates_pair_check,
  add constraint notes_coordinates_pair_check check (
    (lat is null and lng is null)
    or (lat is not null and lng is not null)
  );

create table if not exists public.event_comments (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  author_id uuid not null references public.users (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.users (id) on delete cascade,
  addressee_id uuid not null references public.users (id) on delete cascade,
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  constraint friendships_distinct_participants check (requester_id <> addressee_id),
  constraint friendships_status_check check (status in ('pending', 'accepted'))
);

create unique index if not exists friendships_unordered_pair_unique
  on public.friendships (
    least(requester_id, addressee_id),
    greatest(requester_id, addressee_id)
  );

create index if not exists idx_notes_location_viewport
  on public.notes (lat, lng)
  where lat is not null and lng is not null;

create index if not exists idx_event_comments_event_created
  on public.event_comments (event_id, created_at);
create index if not exists idx_event_comments_author
  on public.event_comments (author_id);

create index if not exists idx_friendships_requester
  on public.friendships (requester_id);
create index if not exists idx_friendships_addressee
  on public.friendships (addressee_id);
create index if not exists idx_friendships_status
  on public.friendships (status);
create index if not exists idx_friendships_incoming_pending
  on public.friendships (addressee_id, status)
  where status = 'pending';

create or replace function public.assert_intern_user(actor_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.users u where u.id = actor_id and u.user_type = 'intern') then
    raise exception 'social actor must be an intern';
  end if;
end;
$$;

revoke all on function public.assert_intern_user(uuid) from public;
grant execute on function public.assert_intern_user(uuid) to authenticated;

create or replace function public.assert_note_map_comment_author_intern()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.lat is not null or new.lng is not null then
    perform public.assert_intern_user(new.created_by);
  end if;

  return new;
end;
$$;

drop trigger if exists notes_map_comment_author_guard on public.notes;
create trigger notes_map_comment_author_guard
  before insert or update on public.notes
  for each row execute function public.assert_note_map_comment_author_intern();

create or replace function public.assert_event_comment_author_intern()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_intern_user(new.author_id);
  return new;
end;
$$;

drop trigger if exists event_comments_author_guard on public.event_comments;
create trigger event_comments_author_guard
  before insert or update on public.event_comments
  for each row execute function public.assert_event_comment_author_intern();

create or replace function public.assert_friendship_participants_interns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.assert_intern_user(new.requester_id);
  perform public.assert_intern_user(new.addressee_id);

  if tg_op = 'UPDATE' then
    if new.requester_id is distinct from old.requester_id
      or new.addressee_id is distinct from old.addressee_id
      or new.created_at is distinct from old.created_at then
      raise exception 'friendship participants are immutable';
    end if;

    if old.status <> 'pending' or new.status <> 'accepted' then
      raise exception 'friendship updates may only accept pending requests';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists friendships_participants_guard on public.friendships;
create trigger friendships_participants_guard
  before insert or update on public.friendships
  for each row execute function public.assert_friendship_participants_interns();

alter table public.event_comments enable row level security;
alter table public.friendships enable row level security;

alter table public.notes force row level security;
alter table public.event_comments force row level security;
alter table public.friendships force row level security;

drop policy if exists notes_insert_owner on public.notes;
drop policy if exists notes_update_owner on public.notes;
drop policy if exists notes_delete_owner on public.notes;

create policy notes_insert_owner on public.notes
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and (
      (lat is null and lng is null)
      or public.is_intern()
    )
  );

create policy notes_update_owner on public.notes
  for update to authenticated
  using (
    created_by = auth.uid()
    and (
      (lat is null and lng is null)
      or public.is_intern()
    )
  )
  with check (
    created_by = auth.uid()
    and (
      (lat is null and lng is null)
      or public.is_intern()
    )
  );

create policy notes_delete_owner on public.notes
  for delete to authenticated using (
    created_by = auth.uid()
    and (
      (lat is null and lng is null)
      or public.is_intern()
    )
  );

create policy event_comments_select_authenticated on public.event_comments
  for select to authenticated using (true);

create policy event_comments_insert_author_intern on public.event_comments
  for insert to authenticated with check (public.is_intern() and author_id = auth.uid());

create policy event_comments_update_author_intern on public.event_comments
  for update to authenticated
  using (public.is_intern() and author_id = auth.uid())
  with check (public.is_intern() and author_id = auth.uid());

create policy event_comments_delete_author_intern on public.event_comments
  for delete to authenticated using (public.is_intern() and author_id = auth.uid());

create policy friendships_select_participants on public.friendships
  for select to authenticated
  using (public.is_intern() and auth.uid() in (requester_id, addressee_id));

create policy friendships_insert_requester on public.friendships
  for insert to authenticated
  with check (public.is_intern() and requester_id = auth.uid() and status = 'pending');

create policy friendships_update_addressee_accept_pending on public.friendships
  for update to authenticated
  using (public.is_intern() and addressee_id = auth.uid() and status = 'pending')
  with check (public.is_intern() and addressee_id = auth.uid() and status = 'accepted');

create policy friendships_delete_addressee_pending on public.friendships
  for delete to authenticated
  using (public.is_intern() and addressee_id = auth.uid() and status = 'pending');
