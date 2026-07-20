# Perch Round 5 - Implementation Plan: PERSON B (live event polling on Vercel)

Mission: the deployed Vercel app polls Ticketmaster ITSELF. Today real events only enter
the feed when a GitHub Action runs `scripts/ingest-events.ts` once per day. After this
round, the deployed app owns its own freshness: a guarded cron route ingests on a
schedule, an on-request cooldown refresh keeps events live under real traffic, and the
GitHub Action is slimmed back to seeding only. `TICKETMASTER_API_KEY` is ALREADY set in
the Vercel project env - you wire polling, not keys.

Branch: `round5-person-b` (cut from `main`). Boundary: server + config only. You own the
cron/ingest routes, `vercel.json`, the workflow file, and ingest internals. No UI, no
schema, no contract.ts changes. Nobody else touches those files this round (15.4).

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 15 (scope, env
addition CRON_SECRET) + 14.1/14.2; the shipped code (lib/events/ticketmaster.ts + its
test, scripts/ingest-events.ts, app/api/events/nearby/route.ts,
app/api/cron/expire-listings/route.ts, .github/workflows/seed-demo.yml, lib/sourcing/*
for the adapter pattern); docs/SECRETS.md.

Working agreements (14.6): plain ASCII; graceful fallback is non-negotiable (no key ->
seeded events, never an empty feed or a crash); rate-safe by design; secrets server-only.

## 1. Scope - what Person B owns in Round 5

- RB51 Shared ingest core + cron route. Extract the ingest logic from
  scripts/ingest-events.ts into lib/events/ingest.ts (pure, testable, idempotent upsert
  keyed on the Ticketmaster event id) and add app/api/cron/ingest-events/route.ts that
  runs it. Guard the route: require `Authorization: Bearer ${CRON_SECRET}` (Vercel sends
  it automatically for cron invocations when CRON_SECRET is set) and 401 otherwise.
  The script keeps working by importing the same core.
- RB52 Scheduling + live freshness. Add `vercel.json` with a crons entry for
  /api/cron/ingest-events (daily - the Hobby plan floor) and wire the EXISTING
  /api/cron/expire-listings route into the same crons block (it currently has no
  scheduler at all). Because a daily cron alone is not "live", add a cooldown-gated
  on-request refresh: when /api/events/nearby (or the feed query path) serves events and
  the newest ingested Ticketmaster row for that city is older than REFRESH_COOLDOWN
  (default 6h), fire the ingest in the background (fire-and-forget with an in-flight
  guard so concurrent requests trigger one refresh). Rate math documented in the code:
  cron 1/day + at most 4 cooldown refreshes/day/city is far inside Ticketmaster's 5k/day.
- RB53 Retire the Action's TM step + prove it live. Remove the "Ingest live Ticketmaster
  events" step from .github/workflows/seed-demo.yml (the seed step STAYS - it keeps demo
  data fresh and the free Supabase project awake). Then verify on the DEPLOYED url:
  cron route 401s without the secret, 200s with it, real upcoming events with image_url
  land in the feed/nearby responses, and the seeded fallback still engages with the key
  removed. Record the evidence in PROGRESS.

### NOT yours
- Any UI (A and D own surfaces), the parser (C), Round 4 provisioning/deploy plumbing.
  If the deployed project is missing CRON_SECRET, add it via the Vercel dashboard/CLI env
  (server-only) and record the key NAME in .env.example - never a value.

## 2. Repo additions
```
lib/events/ingest.ts                     # RB51 shared core (from scripts/ingest-events.ts)
lib/events/ingest.test.ts                # idempotent upsert + cooldown gate tests
app/api/cron/ingest-events/route.ts      # RB51 guarded cron route
vercel.json                              # RB52 crons: ingest-events + expire-listings
app/api/events/nearby/route.ts           # RB52 cooldown-gated background refresh
scripts/ingest-events.ts                 # thin wrapper over the shared core
.github/workflows/seed-demo.yml          # RB53 TM step removed, seed kept
.env.example                             # + CRON_SECRET (name only)
```

## 3. Build phases (commit after each)
- Phase R5B-1 (RB51): extract core + cron route + guard. Acceptance: route 401s without
  the bearer, ingests idempotently with it (re-run adds zero rows); script still works.
- Phase R5B-2 (RB52): vercel.json crons + cooldown refresh. Acceptance: ingest.test
  covers the cooldown gate (fresh -> no call, stale -> one call even under concurrency);
  config lints on `vercel build` or deploy preview.
- Phase R5B-3 (RB53): workflow slimmed + deployed verification. Acceptance: evidence in
  PROGRESS (deployed cron 401/200, real events with images in the response, fallback
  intact without the key).

## 4. Definition of done + demo
Done when the deployed app refreshes Ticketmaster events with no GitHub dependency,
guarded and rate-safe, fallback proven, tests green, PROGRESS + README updated. Demo:
hit the deployed feed - real upcoming events with images; show the cron route rejecting
an unauthenticated call.

## 5. Integration checkpoints
- With A/C/D: none in code. Merge early - your files are disjoint from everyone.
- With Round 4 A (deploy owner): confirm CRON_SECRET is present in Vercel Production +
  Preview env before flipping the workflow change.
