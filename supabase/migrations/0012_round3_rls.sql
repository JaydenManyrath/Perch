-- Round 3 RLS: bookings + roommate grouping (default-deny) and cost-of-living reads.
-- The booking state machine is enforced deterministically here as the database-level
-- backstop; server routes run the same rules through the service role for the happy path.

-- Accepted-friend check reused by the roommate rules.
create or replace function public.is_accepted_friend(a uuid, b uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and (
        (f.requester_id = a and f.addressee_id = b) or
        (f.requester_id = b and f.addressee_id = a)
      )
  )
$$;

revoke all on function public.is_accepted_friend(uuid, uuid) from public;
grant execute on function public.is_accepted_friend(uuid, uuid) to authenticated;

create or replace function public.booking_listing_owner(booking_listing uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select l.created_by from public.listings l where l.id = booking_listing
$$;

revoke all on function public.booking_listing_owner(uuid) from public;
grant execute on function public.booking_listing_owner(uuid) to authenticated;

-- Deterministic booking write guard. Enforced only for authenticated end-user writes
-- (auth.uid() is not null); the service role (server routes, seed) runs the vetted
-- transitions directly and is intentionally exempt, mirroring the other trust triggers.
create or replace function public.assert_booking_write()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  owner_id uuid;
  invite uuid;
  added uuid[];
  removed uuid[];
  added_invites uuid[];
begin
  if caller is null then
    return new;
  end if;

  owner_id := public.booking_listing_owner(coalesce(new.listing_id, old.listing_id));

  if tg_op = 'INSERT' then
    if new.booker_id is distinct from caller then
      raise exception 'a booking can only be requested by the booker';
    end if;
    if not public.is_intern() then
      raise exception 'only interns can request a booking';
    end if;
    if new.status is distinct from 'requested' then
      raise exception 'a new booking must start as requested';
    end if;
    if new.decided_at is not null then
      raise exception 'decided_at is server-controlled';
    end if;
    if array_length(new.roommate_ids, 1) is not null then
      raise exception 'a new booking has no confirmed roommates yet';
    end if;
    if not exists (
      select 1 from public.listings l
      where l.id = new.listing_id and l.status = 'available'
        and l.expires_at > now()
    ) then
      raise exception 'a booking can only be requested on an available listing';
    end if;
    foreach invite in array new.roommate_invites loop
      if not public.is_accepted_friend(caller, invite) then
        raise exception 'roommate invites must be accepted friends of the booker';
      end if;
    end loop;
    return new;
  end if;

  -- UPDATE. Identify what changed.
  if new.listing_id is distinct from old.listing_id
     or new.booker_id is distinct from old.booker_id
     or new.created_at is distinct from old.created_at then
    raise exception 'booking identity is immutable';
  end if;

  select coalesce(array_agg(x), '{}') into added
  from unnest(new.roommate_ids) x where x <> all (old.roommate_ids);
  select coalesce(array_agg(x), '{}') into removed
  from unnest(old.roommate_ids) x where x <> all (new.roommate_ids);
  select coalesce(array_agg(x), '{}') into added_invites
  from unnest(new.roommate_invites) x where x <> all (old.roommate_invites);

  -- Owner transitions: approve or decline a pending request.
  if caller = owner_id then
    if old.status = 'requested' and new.status = 'approved'
       or (old.status in ('requested', 'approved') and new.status = 'declined') then
      if new.roommate_ids is distinct from old.roommate_ids
         or new.roommate_invites is distinct from old.roommate_invites then
        raise exception 'the owner does not change roommates';
      end if;
      return new;
    end if;
    raise exception 'the owner may only approve or decline a pending booking';
  end if;

  -- Booker transitions: confirm (approved -> booked), cancel, or invite roommates.
  if caller = old.booker_id then
    -- confirm
    if old.status = 'approved' and new.status = 'booked'
       and new.roommate_ids is not distinct from old.roommate_ids then
      return new;
    end if;
    -- cancel from any live state
    if old.status in ('requested', 'approved', 'booked') and new.status = 'cancelled'
       and new.roommate_ids is not distinct from old.roommate_ids then
      return new;
    end if;
    -- invite roommates (only while the hold is live and not yet booked): the booker
    -- may not confirm roommates directly, only add pending invites for accepted friends.
    if new.status = old.status and old.status in ('requested', 'approved')
       and new.roommate_ids is not distinct from old.roommate_ids then
      foreach invite in array added_invites loop
        if not public.is_accepted_friend(caller, invite) then
          raise exception 'roommate invites must be accepted friends of the booker';
        end if;
      end loop;
      return new;
    end if;
    raise exception 'invalid booker transition';
  end if;

  -- Invitee accepts: moves only itself from invites to confirmed roommates.
  if caller = any (old.roommate_invites) then
    if new.status is distinct from old.status then
      raise exception 'accepting a roommate invite does not change the booking status';
    end if;
    if array_length(added, 1) is distinct from 1 or added[1] <> caller then
      raise exception 'an invitee may only add itself as a roommate';
    end if;
    if array_length(removed, 1) is not null then
      raise exception 'an invitee may not remove confirmed roommates';
    end if;
    if caller = any (new.roommate_invites) then
      raise exception 'accepting clears the pending invite';
    end if;
    if not public.is_intern() then
      raise exception 'only interns can be roommates';
    end if;
    return new;
  end if;

  raise exception 'not authorized to modify this booking';
end;
$$;

drop trigger if exists bookings_write_guard on public.bookings;
create trigger bookings_write_guard
  before insert or update on public.bookings
  for each row execute function public.assert_booking_write();

-- RLS: only the booker, confirmed roommates, pending invitees, and the listing owner
-- can see or target a booking row.
alter table public.bookings enable row level security;
alter table public.bookings force row level security;

create policy bookings_select_party on public.bookings
  for select to authenticated
  using (
    auth.uid() = booker_id
    or auth.uid() = any (roommate_ids)
    or auth.uid() = any (roommate_invites)
    or auth.uid() = public.booking_listing_owner(listing_id)
  );

create policy bookings_insert_booker on public.bookings
  for insert to authenticated
  with check (public.is_intern() and booker_id = auth.uid() and status = 'requested');

create policy bookings_update_party on public.bookings
  for update to authenticated
  using (
    auth.uid() = booker_id
    or auth.uid() = any (roommate_ids)
    or auth.uid() = any (roommate_invites)
    or auth.uid() = public.booking_listing_owner(listing_id)
  )
  with check (
    auth.uid() = booker_id
    or auth.uid() = any (roommate_ids)
    or auth.uid() = any (roommate_invites)
    or auth.uid() = public.booking_listing_owner(listing_id)
  );

-- No delete policy: bookings are cancelled, never deleted, by end users.

-- Cost-of-living is public reference data: readable by any authenticated user,
-- writable only by the service role (default-deny for authenticated).
alter table public.cost_of_living enable row level security;
alter table public.cost_of_living force row level security;

create policy cost_of_living_select_authenticated on public.cost_of_living
  for select to authenticated using (true);

-- Ensure PostgREST privileges reach the new tables (RLS remains the row boundary).
grant select, insert, update, delete on public.bookings to authenticated;
grant select on public.cost_of_living to authenticated;
grant all privileges on public.bookings to service_role;
grant all privileges on public.cost_of_living to service_role;
