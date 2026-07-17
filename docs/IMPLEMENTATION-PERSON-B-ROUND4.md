# Perch Round 4 - Implementation Plan: PERSON B (hosted DB, migrations, seed, server, secrets)

Mission: make the database real. Link the hosted Supabase project, push all 12 migrations, seed
it idempotently, wire the server-side secrets, and PROVE that RLS, `auth.uid()`, Realtime, and
Storage all work against the real project - not just the fixtures and the throwaway Postgres
harness. Person A points the browser at what you stand up; you own everything server-side and
in the database.

Branch: round4-person-b (restart from main). Boundary with A: you own the hosted project,
migrations, seed, server env/secrets, Storage buckets/policies, and live RLS verification. A owns
middleware, login/logout, the live flip, and deploy connection. You HAND A the project URL + anon
key and a seeded set of demo users; the service-role key never leaves the server/your env.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 14 (env contract, provisioning
seam, session seam, ownership map); docs/IMPLEMENTATION-PERSON-A-ROUND4.md (what A consumes);
docs/SECRETS.md; docs/PROGRESS.md (RB41..RB47); the shipped code (supabase/migrations/*,
supabase/config.toml, scripts/seed.ts, scripts/rls-harness.ts, tests/rls.test.ts,
lib/supabase/{server,admin}.ts, lib/env.ts).

Working agreements (14.6): plain ASCII; update README + PROGRESS every merge; service-role and
all SECRET keys are server-only and never committed or NEXT_PUBLIC_; RLS remains the row-level
boundary - now verified against the REAL database.

## 1. Scope - what Person B owns in Round 4

- RB41 Link + migrate the hosted project. `supabase link` to the existing project ref; push all
  12 migrations (`supabase db push`) so the hosted schema matches `supabase/migrations/*`. Verify
  every table, function, trigger, and the storage buckets exist. Add an npm script and a short
  runbook; the push must be reproducible and idempotent (re-running is a no-op).
- RB42 Seed the hosted project. Run `scripts/seed.ts` against the real project with the
  service-role key: it creates the demo auth users (password `perch-demo-<email>`, the seam A's
  login depends on) and upserts users/listings/bookings/events/etc. Confirm it is idempotent on a
  hosted DB (re-run adds no duplicates). Add a `seed:live` guardrail so it cannot run against the
  wrong project by accident.
- RB43 Secrets + server env. Fill the SECRET server env from docs/SECRETS.md (service-role,
  OPENAI, TICKETMASTER, COMPOSIO) in `.env.local` and Vercel server env; keep `.env.example`
  current; confirm no `NEXT_PUBLIC_` secret. Run the build + client-bundle secret grep and record
  it clean. Kill switches (`LLM_DISABLED`, `COMPOSIO_DISABLED`) default to the deterministic path.
- RB44 Live RLS verification. Point the adversarial RLS check at the hosted project (or run a live
  acceptance): a second real, logged-in user CANNOT read another user's DMs, bookings, swipes,
  reviews, or friendships; owner-only writes hold; reviews are readable by all authed users but
  writable only by an intern reviewer on their own row. Document the results in PROGRESS.
- RB45 Server routes live. Confirm `getCallerId()` resolves `auth.uid()` from the request cookies
  on the hosted project (depends on A's middleware) across the guarded API surface; rate limiting
  intact; admin-client writes still gated by server-side checks. A guarded route returns the
  caller's own data and 401s an anonymous request.
- RB46 Storage buckets + policies on hosted. Ensure migration 0005's buckets exist on the real
  project with correct access policies (public read where intended, owner-write) so A's photo /
  avatar upload path works. Fix any bucket/policy that the hosted environment needs beyond the
  local config.
- RB47 Kill-switch + fallback verification live. With real keys present, confirm the deterministic
  fallbacks still engage when a key is removed (no crash), and the rate-limit envs
  (`RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`) apply. This protects the paid endpoints in production.

### NOT yours
- Person A: middleware, login/logout, protected-route redirects, the client live flip, Realtime
  subscription UI, the Mapbox public token, the upload UI, and the Vercel repo connection. You
  PROVIDE the seeded users, the project URL + anon key, and working server routes; A drives them.

## 2. Repo additions
```
package.json                          # RB41/RB42 scripts: db:push, seed:live guardrail
docs/RUNBOOK-LIVE-BACKEND.md          # RB41 link + migrate + seed + verify, step by step
scripts/seed.ts                       # RB42 harden for hosted (guardrail; keep idempotent)
.env.example                          # RB43 keep current (owner)
tests/rls.test.ts / scripts/rls-harness.ts  # RB44 reuse against the hosted DB URL
```
No schema changes are required (migrations 0001-0012 are the source of truth); add a new migration
only if the hosted environment surfaces a real gap.

## 3. Build phases (commit after each; update PROGRESS + README each merge)
- Phase R4B-1 Link + migrate + seed (RB41/RB42): link, push all migrations, seed idempotently,
  verify schema + buckets + demo users exist. Acceptance: the hosted project matches the migrations;
  re-running push and seed is a no-op; A can now log in as intern0. HAND A the URL + anon key.
- Phase R4B-2 Secrets + server live (RB43/RB45/RB47): fill server env, bundle-grep clean, confirm
  `getCallerId()` + rate limiting + kill switches live. Acceptance: a guarded route returns the
  caller's data and 401s anonymous; no secret in the client bundle.
- Phase R4B-3 Live RLS + Storage (RB44/RB46): prove cross-user isolation on the real DB; confirm
  Storage buckets/policies back A's uploads. Acceptance: a second user is fully isolated by RLS on
  the hosted project; an uploaded object obeys its bucket policy.

## 4. Definition of done + demo checklist
Done when: the hosted project has all 12 migrations applied reproducibly and an idempotent seed
(demo users included); server secrets are set server-only with a clean client-bundle grep;
`getCallerId()`/RLS enforce real per-user isolation on the hosted DB; Storage buckets/policies
back A's uploads; kill switches + rate limits verified. README + PROGRESS updated with the live
verification results. Demo: log in as two seeded users and show that user B cannot read user A's
DMs/bookings on the REAL database; show the migrate + seed runbook reproducing the project.

## 5. Integration checkpoints
- With A (FIRST): link + migrate + seed and hand A the URL + anon key before A's live login
  acceptance - A is blocked until the seeded users exist.
- With A (session): A's middleware must be in for `getCallerId()` to resolve; jointly confirm a
  guarded route returns the logged-in caller's data.
- With A (deploy): you supply the server-secret env values for Vercel (Production + Preview); A
  owns the connection and the PUBLIC vars. Every merge to main: update README + PROGRESS.
