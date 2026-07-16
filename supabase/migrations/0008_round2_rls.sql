-- Round 2 RLS and server-side guards.

create or replace function public.current_user_type()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.user_type from public.users u where u.id = auth.uid()
$$;

revoke all on function public.current_user_type() from public;
grant execute on function public.current_user_type() to authenticated;

create or replace function public.is_intern()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_type() = 'intern', false)
$$;

create or replace function public.is_subletter()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_user_type() = 'subletter', false)
$$;

revoke all on function public.is_intern() from public;
revoke all on function public.is_subletter() from public;
grant execute on function public.is_intern() to authenticated;
grant execute on function public.is_subletter() to authenticated;

create or replace function public.assert_authenticated_user_trust_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.verified is distinct from false or new.user_type is distinct from 'intern' then
      raise exception 'verified and user_type are server-controlled';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.verified is distinct from old.verified or new.user_type is distinct from old.user_type then
      raise exception 'verified and user_type are server-controlled';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists users_trust_fields_guard on public.users;
create trigger users_trust_fields_guard
  before insert or update on public.users
  for each row execute function public.assert_authenticated_user_trust_fields();

create or replace function public.assert_authenticated_listing_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if new.created_by is distinct from auth.uid()
      or new.sourced is distinct from false
      or new.source is not null
      or new.source_name is distinct from 'subletter'
      or new.source_url is not null
      or new.external_id is not null
      or new.status is distinct from 'available'
      or new.expires_at is null
      or new.last_confirmed_at is not null then
      raise exception 'listing ownership, provenance, and freshness fields are server-controlled';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.created_by is distinct from old.created_by
      or new.sourced is distinct from old.sourced
      or new.source is distinct from old.source
      or new.source_name is distinct from old.source_name
      or new.source_url is distinct from old.source_url
      or new.external_id is distinct from old.external_id
      or new.status is distinct from old.status
      or new.expires_at is distinct from old.expires_at
      or new.last_confirmed_at is distinct from old.last_confirmed_at then
      raise exception 'listing ownership, provenance, and freshness fields are server-controlled';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists listings_protected_fields_guard on public.listings;
create trigger listings_protected_fields_guard
  before insert or update on public.listings
  for each row execute function public.assert_authenticated_listing_protected_fields();

create or replace function public.assert_review_subject_valid()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.subject_type = 'listing' then
    if not exists (select 1 from public.listings l where l.id = new.subject_id) then
      raise exception 'review listing subject does not exist';
    end if;
  elsif new.subject_type = 'subletter' then
    if not exists (
      select 1 from public.users u where u.id = new.subject_id and u.user_type = 'subletter'
    ) then
      raise exception 'review subletter subject does not exist';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists reviews_subject_guard on public.reviews;
create trigger reviews_subject_guard
  before insert or update on public.reviews
  for each row execute function public.assert_review_subject_valid();

create or replace function public.assert_intern_social_actor()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid;
begin
  if tg_table_name = 'reviews' then
    actor_id := new.reviewer_id;
  else
    actor_id := new.user_id;
  end if;

  if not exists (select 1 from public.users u where u.id = actor_id and u.user_type = 'intern') then
    raise exception 'social action actor must be an intern';
  end if;

  return new;
end;
$$;

drop trigger if exists listing_swipes_intern_actor_guard on public.listing_swipes;
create trigger listing_swipes_intern_actor_guard
  before insert or update on public.listing_swipes
  for each row execute function public.assert_intern_social_actor();

drop trigger if exists reviews_intern_actor_guard on public.reviews;
create trigger reviews_intern_actor_guard
  before insert or update on public.reviews
  for each row execute function public.assert_intern_social_actor();

drop trigger if exists event_attendance_intern_actor_guard on public.event_attendance;
create trigger event_attendance_intern_actor_guard
  before insert or update on public.event_attendance
  for each row execute function public.assert_intern_social_actor();

create or replace function public.event_attendance_count(event uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer from public.event_attendance ea where ea.event_id = event
$$;

revoke all on function public.event_attendance_count(uuid) from public;
grant execute on function public.event_attendance_count(uuid) to authenticated;

alter table public.listing_swipes enable row level security;
alter table public.reviews enable row level security;
alter table public.event_attendance enable row level security;

alter table public.listing_swipes force row level security;
alter table public.reviews force row level security;
alter table public.event_attendance force row level security;

drop policy if exists users_insert_self on public.users;
drop policy if exists users_update_self on public.users;
drop policy if exists listings_insert_owner on public.listings;
drop policy if exists listings_update_owner on public.listings;
drop policy if exists listings_delete_owner on public.listings;

create policy users_insert_self on public.users
  for insert to authenticated
  with check (id = auth.uid() and verified = false and user_type = 'intern');

create policy users_update_self on public.users
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy listings_update_subletter_owner on public.listings
  for update to authenticated
  using (public.is_subletter() and created_by = auth.uid() and sourced = false and source_name = 'subletter')
  with check (public.is_subletter() and created_by = auth.uid() and sourced = false and source_name = 'subletter');

create policy listings_delete_subletter_owner on public.listings
  for delete to authenticated
  using (public.is_subletter() and created_by = auth.uid() and sourced = false and source_name = 'subletter');

create policy listing_swipes_select_owner on public.listing_swipes
  for select to authenticated using (public.is_intern() and user_id = auth.uid());

create policy listing_swipes_insert_owner on public.listing_swipes
  for insert to authenticated with check (public.is_intern() and user_id = auth.uid());

create policy listing_swipes_update_owner on public.listing_swipes
  for update to authenticated
  using (public.is_intern() and user_id = auth.uid())
  with check (public.is_intern() and user_id = auth.uid());

create policy listing_swipes_delete_owner on public.listing_swipes
  for delete to authenticated using (public.is_intern() and user_id = auth.uid());

create policy reviews_select_authenticated on public.reviews
  for select to authenticated using (true);

create policy reviews_insert_reviewer_intern on public.reviews
  for insert to authenticated with check (public.is_intern() and reviewer_id = auth.uid());

create policy reviews_update_reviewer_intern on public.reviews
  for update to authenticated
  using (public.is_intern() and reviewer_id = auth.uid())
  with check (public.is_intern() and reviewer_id = auth.uid());

create policy reviews_delete_reviewer_intern on public.reviews
  for delete to authenticated using (public.is_intern() and reviewer_id = auth.uid());

create policy event_attendance_select_owner on public.event_attendance
  for select to authenticated using (public.is_intern() and user_id = auth.uid());

create policy event_attendance_insert_owner on public.event_attendance
  for insert to authenticated with check (public.is_intern() and user_id = auth.uid());

create policy event_attendance_update_owner on public.event_attendance
  for update to authenticated
  using (public.is_intern() and user_id = auth.uid())
  with check (public.is_intern() and user_id = auth.uid());

create policy event_attendance_delete_owner on public.event_attendance
  for delete to authenticated using (public.is_intern() and user_id = auth.uid());
