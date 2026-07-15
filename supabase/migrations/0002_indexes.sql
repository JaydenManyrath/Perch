-- 0002_indexes.sql — B1
-- Indexes on FKs + hot query paths (plan §5 Phase 1 acceptance).

-- messages: Realtime channel key + ordering.
create index if not exists idx_messages_conversation_id on public.messages (conversation_id);
create index if not exists idx_messages_created_at       on public.messages (created_at);
create index if not exists idx_messages_sender_id        on public.messages (sender_id);
create index if not exists idx_messages_recipient_id     on public.messages (recipient_id);

-- conversations: participant lookup for the connection-hero create-or-open (§7).
create index if not exists idx_conversations_participants on public.conversations using gin (participant_ids);
create index if not exists idx_conversations_last_message on public.conversations (last_message_at desc);

-- events: feed sort + map/geo filter.
create index if not exists idx_events_datetime on public.events (datetime desc);
create index if not exists idx_events_geo       on public.events (lat, lng);
create index if not exists idx_events_category  on public.events (category);

-- listings: budget/price paths + geo for routine-fit.
create index if not exists idx_listings_price on public.listings (price);
create index if not exists idx_listings_geo   on public.listings (lat, lng);
create index if not exists idx_listings_created_by on public.listings (created_by);

-- stickers: map layer geo.
create index if not exists idx_stickers_geo      on public.stickers (lat, lng);
create index if not exists idx_stickers_category on public.stickers (category);
create index if not exists idx_stickers_created_by on public.stickers (created_by);

-- notes + checklist ownership/scoping.
create index if not exists idx_notes_city         on public.notes (city);
create index if not exists idx_notes_created_by   on public.notes (created_by);
create index if not exists idx_checklist_user     on public.checklist_items (user_id);
