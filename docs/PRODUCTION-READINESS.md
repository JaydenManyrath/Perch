# Production Readiness - the honest remaining-work checklist

Status date: 2026-07-20 (branch r6-prod-audit). This is the single list of what is
left to go live. Everything code-side for Round 4 (RA41-RA46) is merged to main and
was re-audited with evidence on this date; the hosted Supabase project exists, is
migrated, is seeded, passes the live login smoke, and holds 39 live Ticketmaster
events. What remains is (a) dashboard work only the project owner can do, (b)
verifications blocked on credentials not present on this machine, and (c) code-level
notes found during the audit.

Current local state, verified 2026-07-20: `.env.local` holds
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
NEXT_PUBLIC_MAPBOX_TOKEN, TICKETMASTER_API_KEY, and NEXT_PUBLIC_DATA_SOURCE. It does
NOT hold SUPABASE_DB_URL, OPENAI_API_KEY, CRON_SECRET, or COMPOSIO_API_KEY. There is
no `.vercel/` project link in this checkout.

---

## (a) Owner-dashboard items (nobody else can do these)

### 1. Vercel project + environment variables

Create (or link) the Vercel project for this repo, then set these in
Project Settings -> Environment Variables, for BOTH Production and Preview.

Public (safe in the client bundle):

| Variable | Value |
|---|---|
| NEXT_PUBLIC_SUPABASE_URL | the hosted project URL |
| NEXT_PUBLIC_SUPABASE_ANON_KEY | the anon key (RLS-protected) |
| NEXT_PUBLIC_MAPBOX_TOKEN | the Mapbox public token |
| NEXT_PUBLIC_DATA_SOURCE | `live` |

Secret (server-only; NEVER prefix these with NEXT_PUBLIC_):

| Variable | Why |
|---|---|
| SUPABASE_SERVICE_ROLE_KEY | admin client: onboarding account mint, cron ingest, freshness pass |
| TICKETMASTER_API_KEY | live event ingest (without it the cron is a clean no-op) |
| CRON_SECRET | guards /api/cron/*; Vercel Cron sends it as `Authorization: Bearer` automatically. Without it the cron routes FAIL CLOSED in production |
| OPENAI_API_KEY (optional) | enables LLM narration + LLM-first offer parsing; absent = deterministic fallback, no crash |
| OPENAI_MODEL (optional) | defaults to gpt-4o-mini |
| RATE_LIMIT_WINDOW_MS / RATE_LIMIT_MAX (optional) | guarded-route rate limiting; defaults 60000 / 20 |

After the first deploy, confirm the two vercel.json crons appear under
Project -> Settings -> Cron Jobs (`/api/cron/ingest-events` daily 12:00 UTC,
`/api/cron/expire-listings` daily 06:00 UTC).

### 2. GitHub Actions repository secrets

Settings -> Secrets and variables -> Actions -> New repository secret:

- `SUPABASE_SERVICE_ROLE_KEY` - required NOW by `.github/workflows/seed-demo.yml`
  (daily idempotent re-seed; also keeps the free-tier project from idle-pausing).
- `TICKETMASTER_API_KEY` - for the incoming `ingest-events.yml` workflow (owned by
  the other work stream; seed-demo.yml itself no longer calls Ticketmaster).

### 3. Supabase dashboard auth URLs

Authentication -> URL Configuration on the hosted project:

- Site URL: the deployed production domain (e.g. `https://<project>.vercel.app`).
- Redirect URLs: add the production domain and any preview-domain pattern you will
  sign in from. Password sign-in works without this, but keeping it correct avoids
  auth redirects breaking on the deployed domain later.

### 4. Post-deploy smokes (5 minutes, on the deployed URL)

- `/login` with `intern0@perch.demo` -> lands on /feed with a live session; sign-out returns to /login; a signed-out visit to /feed redirects to /login.
- /feed shows live Ticketmaster events (hosted project already holds 39).
- Map renders real Mapbox tiles; click a marker for the info sheet (closes the long-standing RA38/RA45 browser gap).
- `curl https://<domain>/api/cron/ingest-events` -> 401 (proves CRON_SECRET is set and the guard is closed).
- Two browsers, two accounts, one DM thread -> messages appear live in both (closes the RA44 live-Realtime verification).

## (b) Verifications blocked on credentials not on this machine

Blocked:

- Hosted adversarial RLS suite (28 cases + storage policies) and the two-user
  isolation demo. Both need `SUPABASE_DB_URL` - the DIRECT Postgres connection
  string incl. the database password (Supabase dashboard -> Database -> Connection
  string). Not in `.env.local`. Once present:
  `RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL="$SUPABASE_DB_URL" npm run rls:test`
  (the suite passed on real local Postgres on 2026-07-17; the hosted run is the
  remaining proof).
- Deployed-URL cron smoke - needs the Vercel deploy + CRON_SECRET (section a).
- Paid LLM smokes (`LIVE_LLM=1` offer-parse smoke, live narration) - need
  OPENAI_API_KEY.
- Composio Spotify connect - needs COMPOSIO_API_KEY (fixture taste fallback covers
  the demo without it).

Runnable NOW on this machine (`.env.local` has the project URL + anon + service
keys), and run during this audit:

- `RUN_AUTH_TESTS=1 AUTH_TEST_SUPABASE_URL=... AUTH_TEST_SUPABASE_ANON_KEY=... npx vitest run tests/auth-live.test.ts`
  -> PASSED 2026-07-20 against the hosted project (signs in the seeded banded
  intern, reads its RLS-scoped profile).
- Read-only hosted events check (anon key + demo sign-in) -> 39 events with
  source=ticketmaster, 54 total, 2026-07-20.
- Also runnable but not run here (no browser in the audit environment): a local
  `npm run dev` browser pass with live data - real Mapbox tiles + marker clicks
  (NEXT_PUBLIC_MAPBOX_TOKEN is present) and a two-tab live DM session. These
  otherwise fold into the post-deploy smokes in (a).

## (c) Code-level notes found in the audit and not fixed

Nothing blocking was found; RA41-RA46 are genuinely implemented (see PROGRESS.md
for per-item evidence). Two notes, deliberately left alone:

1. `lib/events/ticketmaster.ts` line 46 uses `require("crypto")` under an
   eslint-disable for `@typescript-eslint/no-var-requires`. That comment broke
   `next lint` repo-wide (rule definition not found) because the plugin was never
   registered; this audit registered the `@typescript-eslint` plugin in
   `.eslintrc.json` (no rules enabled, zero behavior change) instead of editing the
   owned file. The file could simply use the existing top-level import style and
   drop the comment - owner's call, cosmetic either way.
2. Storage policy scope (migration 0005): the `listing-photos` INSERT policy checks
   only `bucket_id` - any authenticated user may write under any path prefix,
   including another user's `{uid}/` folder (reads are public by design; overwrite
   is impossible because uploads use `upsert: false` with a random nonce). The
   private buckets (offer-letters, takeout) DO enforce the `{uid}/` prefix. Fixing
   listing-photos to match would be a new migration - out of this audit's scope
   (no schema changes), acceptable risk for a demo, worth tightening before real
   users.
