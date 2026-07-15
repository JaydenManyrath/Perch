-- 0003_rls_enable_and_deny.sql — B2 (HIGHEST RISK, DEMO-BLOCKING)
-- Enable RLS on EVERY table. With RLS enabled and no policy, access is DENIED by
-- default. The per-table policies in 0004 then grant the minimum. Contract §2:
-- "every table denies by default."

alter table public.users            enable row level security;
alter table public.listings         enable row level security;
alter table public.stickers         enable row level security;
alter table public.conversations    enable row level security;
alter table public.messages         enable row level security;
alter table public.events           enable row level security;
alter table public.notes            enable row level security;
alter table public.checklist_items  enable row level security;

-- Force RLS even for the table owner so tests can't accidentally pass via ownership
-- (service-role connections bypass RLS regardless; seed uses the service role).
alter table public.users            force row level security;
alter table public.listings         force row level security;
alter table public.stickers         force row level security;
alter table public.conversations    force row level security;
alter table public.messages         force row level security;
alter table public.events           force row level security;
alter table public.notes            force row level security;
alter table public.checklist_items  force row level security;

-- Helper: is the caller a participant of a given conversation?
-- SECURITY DEFINER + locked search_path so the messages policies can check
-- membership without being blocked by conversations' own RLS.
create or replace function public.is_participant(conv uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    where c.id = conv
      and auth.uid() = any (c.participant_ids)
  );
$$;
revoke all on function public.is_participant(uuid) from public;
grant execute on function public.is_participant(uuid) to authenticated;
