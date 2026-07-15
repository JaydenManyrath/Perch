-- 0004_rls_policies.sql — B2
-- Per-table least-privilege policies. The messages/conversations policies are the
-- single most security-critical code in the app (contract §2 / §5): a user must
-- never be able to read another pair's DMs. Adversarially tested in tests/rls.test.ts.

-- ============================================================ users
-- Profiles readable by any authenticated user; a user writes only their own row.
create policy users_select_authenticated on public.users
  for select to authenticated using (true);

create policy users_insert_self on public.users
  for insert to authenticated with check (id = auth.uid());

create policy users_update_self on public.users
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- ============================================================ listings (public read, owner write)
create policy listings_select_authenticated on public.listings
  for select to authenticated using (true);

create policy listings_insert_owner on public.listings
  for insert to authenticated with check (created_by = auth.uid());

create policy listings_update_owner on public.listings
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy listings_delete_owner on public.listings
  for delete to authenticated using (created_by = auth.uid());

-- ============================================================ stickers (public read, owner write)
-- Positive-only category is enforced by the table CHECK (0001); RLS adds ownership.
create policy stickers_select_authenticated on public.stickers
  for select to authenticated using (true);

create policy stickers_insert_owner on public.stickers
  for insert to authenticated with check (created_by = auth.uid());

create policy stickers_update_owner on public.stickers
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy stickers_delete_owner on public.stickers
  for delete to authenticated using (created_by = auth.uid());

-- ============================================================ notes (public read, owner write)
create policy notes_select_authenticated on public.notes
  for select to authenticated using (true);

create policy notes_insert_owner on public.notes
  for insert to authenticated with check (created_by = auth.uid());

create policy notes_update_owner on public.notes
  for update to authenticated using (created_by = auth.uid()) with check (created_by = auth.uid());

create policy notes_delete_owner on public.notes
  for delete to authenticated using (created_by = auth.uid());

-- ============================================================ events (read-only to clients)
-- Seeded / server-written via the service role (which bypasses RLS). No client writes.
create policy events_select_authenticated on public.events
  for select to authenticated using (true);

-- ============================================================ checklist_items (owner-only, read+write)
create policy checklist_select_owner on public.checklist_items
  for select to authenticated using (user_id = auth.uid());

create policy checklist_insert_owner on public.checklist_items
  for insert to authenticated with check (user_id = auth.uid());

create policy checklist_update_owner on public.checklist_items
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy checklist_delete_owner on public.checklist_items
  for delete to authenticated using (user_id = auth.uid());

-- ============================================================ conversations (PARTICIPANT-LOCKED)
-- Readable/writable only if the caller is one of the two participants.
create policy conversations_select_participant on public.conversations
  for select to authenticated using (auth.uid() = any (participant_ids));

create policy conversations_insert_participant on public.conversations
  for insert to authenticated with check (auth.uid() = any (participant_ids));

-- last_message_at updates by a participant (A8 bumps this on send).
create policy conversations_update_participant on public.conversations
  for update to authenticated
  using (auth.uid() = any (participant_ids))
  with check (auth.uid() = any (participant_ids));
-- No delete policy → deletes denied by default.

-- ============================================================ messages (PARTICIPANT-LOCKED)
-- The single most security-critical policy: a row is visible only to participants of
-- its conversation. Insert additionally requires the caller to be the sender.
create policy messages_select_participant on public.messages
  for select to authenticated
  using (public.is_participant(conversation_id));

create policy messages_insert_participant on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_participant(conversation_id)
  );
-- No update/delete policies → messages are immutable for the demo (denied by default).
