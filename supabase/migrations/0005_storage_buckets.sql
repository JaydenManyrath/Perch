-- 0005_storage_buckets.sql — B1
-- Storage buckets + object policies.
--   listing-photos : PUBLIC read (photos shown on the map/stories); owner writes.
--   offer-letters  : PRIVATE (sensitive PII); owner-only, keyed on a {uid}/ path prefix.
--   takeout        : PRIVATE (location history); owner-only, same prefix convention.

insert into storage.buckets (id, name, public)
values
  ('listing-photos', 'listing-photos', true),
  ('offer-letters',  'offer-letters',  false),
  ('takeout',        'takeout',        false)
on conflict (id) do nothing;

-- ---- listing-photos: anyone may read (public bucket); authenticated may upload.
create policy "listing_photos_read_public" on storage.objects
  for select using (bucket_id = 'listing-photos');

create policy "listing_photos_write_authenticated" on storage.objects
  for insert to authenticated with check (bucket_id = 'listing-photos');

-- ---- offer-letters: owner-only. Convention: object path begins with the owner's uid.
create policy "offer_letters_owner_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'offer-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'offer-letters'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---- takeout: owner-only, same convention.
create policy "takeout_owner_all" on storage.objects
  for all to authenticated
  using (
    bucket_id = 'takeout'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'takeout'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
