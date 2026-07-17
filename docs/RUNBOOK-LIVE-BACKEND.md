# Runbook - Live backend (Round 4, Person B)

How to take the fixture-first app to a real Postgres backend: link/migrate, seed,
and verify RLS + Storage + the server auth seam. Two modes:

- LIVE  - a hosted Supabase project (real auth, Realtime, Storage).
- LOCAL - a throwaway Postgres, for proving the migrations/seed/RLS end to end
  with no cloud account. This is what the branch was verified against.

All secrets live only in gitignored `.env.local`. `.env.example` is the
authoritative key list. Never `NEXT_PUBLIC_` a secret; never commit `.env.local`.

---

## 0. Prerequisites

```
npm ci
```

Everything below uses plain `psql` + `pg` over a direct Postgres URL - no Supabase
CLI and no Docker required. (If you prefer the CLI path, `supabase link --project-ref
<ref>` + `supabase db push` applies the same `supabase/migrations/*`; the direct
path here is the CLI-free equivalent.)

---

## 1. LIVE mode (hosted Supabase project)

### 1.1 Fill `.env.local`
Copy `.env.example` to `.env.local` and set at least:

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>            # PUBLIC
SUPABASE_SERVICE_ROLE_KEY=<service-role key>        # SECRET, server-only
SUPABASE_DB_URL=postgres://postgres:<db-password>@db.<ref>.supabase.co:5432/postgres  # SECRET
```

Optional server secrets (each has a deterministic fallback if blank):
`OPENAI_API_KEY`, `TICKETMASTER_API_KEY`, `COMPOSIO_API_KEY`.

### 1.2 Apply all 12 migrations (idempotent)
```
npm run db:push:live
```
- Applies `supabase/migrations/0001..0012` in order over `SUPABASE_DB_URL`,
  tracked in `perch_meta.applied_migrations`, so re-running is a no-op.
- Refuses to run if `SUPABASE_DB_URL` is not a hosted (`*.supabase.co`/pooler) URL.
- Prints a verify line: table/function/trigger counts, the three storage buckets,
  and that every public table has forced RLS.

### 1.3 Seed the project (idempotent; creates the demo login users)
```
npm run seed:live
```
- Uses the service-role key to create the demo auth users with password
  `perch-demo-<email>` (the seam Person A's `/login` depends on - do not change it)
  and upsert the demo data. Re-running adds no duplicates.
- Refuses to run unless `NEXT_PUBLIC_SUPABASE_URL` is a hosted project.

Hand Person A: the project URL + anon key (public). The service-role key stays
in server env only.

### 1.4 Verify RLS on the real DB
Point the adversarial suite at the hosted direct URL:
```
RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL="$SUPABASE_DB_URL" npm run rls:test
```
28 participant-lock/ownership cases + 5 storage-policy cases must pass.

### 1.5 Live login smoke test (joint with Person A's middleware)
```
RUN_AUTH_TESTS=1 \
AUTH_TEST_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL" \
AUTH_TEST_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY" \
npx vitest run tests/auth-live.test.ts
```
Signs in `intern0@perch.demo` and reads its RLS-scoped profile.

---

## 2. LOCAL mode (no cloud account)

Stand up a throwaway Postgres, then run the exact same scripts against it.

### 2.1 Start Postgres on :54322
Any Postgres works. Example with a local cluster:
```
initdb -D ./.pgdata -U postgres --auth=trust
pg_ctl -D ./.pgdata -o "-p 54322" -w start
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" -c "create database perch;"
```

### 2.2 Migrate + seed + verify
```
export LOCAL_DB="postgresql://postgres:postgres@127.0.0.1:54322/perch"

SUPABASE_DB_URL="$LOCAL_DB"   npm run db:push        # applies shims + 12 migrations, tracked
SEED_DIRECT_DB_URL="$LOCAL_DB" npm run seed:local    # idempotent owner-level seed
SEED_DIRECT_DB_URL="$LOCAL_DB" npm run rls:acceptance # two-user isolation demo (PASS/FAIL)

RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL="$LOCAL_DB" npm run rls:test   # 33 gated tests
```

Notes on LOCAL vs LIVE (by design):
- `db:push` applies Supabase-compatible `auth`/`storage` shims first (a hosted
  project already ships these; `db:push:live` skips them).
- `seed:local` uses deterministic uuids and creates NO login passwords - there is
  no GoTrue locally, so `/login` is a LIVE-only capability. `auth.uid()` still
  resolves from a per-connection JWT claim, which is all RLS needs.

---

## 3. Secret hygiene check (both modes)
```
npm run build
grep -REn "SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY|COMPOSIO_API_KEY|SPOTIFY_CLIENT_SECRET|GOOGLE_CLIENT_SECRET|TICKETMASTER_API_KEY|SUPABASE_DB_URL" .next/static || echo "clean"
```
Must print `clean`.

## 4. Kill switches (protect the paid endpoints)
- `LLM_DISABLED=1` forces the deterministic narration path (no OpenAI calls).
- `COMPOSIO_DISABLED=1` forces the fixture taste profile (no Composio calls).
- With no key set, both are already off - a missing key never crashes a screen.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` bound every guarded route.
`npx vitest run tests/kill-switches.test.ts tests/guard.test.ts tests/ratelimit.test.ts`
covers these.

## 5. Vercel env (deploy)
Person A owns the repo-to-Vercel connection and the PUBLIC vars. Person B supplies
the SECRET server env values (service-role, OpenAI, Ticketmaster, Composio,
`SUPABASE_DB_URL`) for both Production and Preview. Never expose a secret as
`NEXT_PUBLIC_`.
