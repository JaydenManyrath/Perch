/**
 * Supabase-compatible bootstrap shims for a PLAIN Postgres instance (RB41).
 *
 * A real hosted Supabase project already ships the `auth` and `storage` schemas,
 * the `auth.uid()` resolver, and the `authenticated` / `anon` / `service_role`
 * roles. A throwaway local Postgres (LOCAL mode) has none of these, so the
 * migration applier and the RLS harness bootstrap a minimal, compatible subset
 * BEFORE applying supabase/migrations/*. Both `scripts/db-push.ts` and
 * `tests/rls.test.ts` import these so the shim never drifts between them.
 *
 * On a managed project these are never applied (see `isManaged`).
 */

/** auth schema, auth.uid() from the JWT claims GUC, and the three Supabase roles. */
export const AUTH_BOOTSTRAP = `
create schema if not exists auth;
create table if not exists auth.users (id uuid primary key);
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claims', true)::json->>'sub','')::uuid
$$;
do $$ begin
  if not exists (select from pg_roles where rolname = 'authenticated') then create role authenticated; end if;
  if not exists (select from pg_roles where rolname = 'anon') then create role anon; end if;
  if not exists (select from pg_roles where rolname = 'service_role') then create role service_role bypassrls; end if;
end $$;
grant usage on schema public to authenticated, anon;
grant usage on schema auth to authenticated, anon;
`;

/** storage schema, buckets/objects tables, and storage.foldername() used by 0005 policies. */
export const STORAGE_BOOTSTRAP = `
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_accessed_at timestamptz default now(),
  metadata jsonb
);
create or replace function storage.foldername(name text) returns text[] language sql immutable as $$
  select case
    when name is null or name = '' then array[]::text[]
    else (string_to_array(name, '/'))[1:greatest(array_length(string_to_array(name, '/'), 1) - 1, 0)]
  end
$$;
grant usage on schema storage to authenticated, anon;
grant select, insert, update, delete on all tables in schema storage to authenticated;
`;
