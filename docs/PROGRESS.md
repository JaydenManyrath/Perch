# Perch - Progress Tracker

Single source of truth for build status. Every merge to `main` updates this file (mark items done, dated) and `README.md`. Plain ASCII only (no emojis, no em-dashes).

Status keys: `[done]` merged to main | `[verified]` implemented and accepted on the release-candidate branch | `[wip]` in progress | `[todo]` planned | `[blocked]` waiting on a dependency.

## Round 1 - v1 app (shipped, merged to main)

Merged 2026-07-16. The full Instagram-shaped app is live on seed/fixture data with both heroes wired (streaming housing negotiation + the live intern-connection beat).

### Experience & Social Shell
- [done] A1 Design system: tokens in tailwind.config, shadcn primitives, /tokens page
- [done] A2 Mascot: recolored to baby-blue, keyframes, Mascot component, reduced-motion
- [done] A3 App shell + 5-tab nav (feed/stories/map/dms/profile)
- [done] A4 Flyway feed + notes threads
- [done] A5 Perches tray + LandInTray motion primitive
- [done] A6 Profile + banded badge + pre-flight checklist
- [done] A7 Discovery + match cards
- [done] A8 Realtime DMs + optimistic reconcile (TDD)
- [done] A9 Map + positive-only stickers
- [done] A10 Connection hero front: match card -> Message now -> live DM
- [done] A11 Skeletons / empty / loading polish
- [done] A12 Onboarding flow
- [done] A13 Landing / itinerary screen

### Intelligence, Data & Hero
- [done] B1 Supabase schema (0001) + indexes (0002) + storage (0005)
- [done] B2 RLS enable/deny (0003) + policies (0004) + adversarial RLS test suite
- [done] B3 Auth + banded flag (seeded)
- [done] B4 Idempotent seed generator
- [done] B5 Composio Spotify connect (+ fallback)
- [done] B6 Parsers: offer-letter PDF + Maps Takeout (+ fixtures + tests)
- [done] B7 Matching engine: /api/feed + /api/matches
- [done] B8 Itinerary + /api/itinerary
- [done] B9 Life-map places + distance math
- [done] B10 Streaming negotiation hero (end to end + results screen)
- [done] B11 Connection hero back: matching engine
- [done] B12 Secret management + rate-limiting

## Round 2 (shipped, merged to main)

All UI + schema + APIs + integrations landed on `main`. Split three ways during the build: UI, schema + core CRUD APIs, integrations + AI.

### UI (all consumer surfaces)
- [done] RA1 Perches swipe deck (Tinder-style: drag left/right + Pass/Save buttons + detail sheet)
- [done] RA2 Saved tray populated by right-swipes
- [done] RA3 Subletter "post a sublease" form (subletter accounts)
- [done] RA4 Listing freshness badges + subletter confirm/relist UI
- [done] RA5 Reviews UI: star composer + review lists + rating badges (on perch detail + subletter profile)
- [done] RA6 Tappable profiles everywhere; subletter profile view
- [done] RA7 Map: Google-Maps-style category icons + event pins + legend
- [done] RA8 Event card: venue/image + "N interns going" + Going toggle
- [done] RA9 Onboarding OfferStep: manual-correction UI for low-confidence fields
- [done] RA10 Plain-ASCII sweep of user-facing strings (no emojis/em-dashes)
- [done] RA11 Feed events-only
- [done] RA12 Map comment placeholders + read/add sheet on the map
- [done] RA13 Event comments UI (composer + list) on the event card
- [done] RA14 Event going Y/N poll + "N interns going" count on the event card
- [done] RA15 Feed pictures
- [done] RA16 Friends UI: add-friend button + friends list + requests inbox
- [done] RA17 DMs Instagram-Notes strip
- [done] RA18 Front-page cleanup
- [done] RA19 Apartment route on map (colored, road-following via Mapbox Directions) + POI-along-route selection + schedule view
- [done] Follow-ups: Message-on-profile, rename Perches, deterministic conversation IDs, /dms client-side refresh, per-card swipe motion (no after-image)

### Schema + core CRUD APIs
- [done] RB1 Migrations for user_type; listings status/expiry/sourced/source_name/source_url/external_id
- [done] RB2 Migrations + RLS for listing_swipes, reviews, event_attendance (+ RLS test suite)
- [done] RB3 Perches API: GET /api/perches, POST /api/perches/swipe, GET /api/perches/saved
- [done] RB4 Subletter posting: POST /api/listings, POST /api/listings/{id}/confirm + validation + owner RLS
- [done] RB5 Reviews API: GET/POST /api/reviews + summary aggregation
- [done] RB6 Attendance API: POST /api/events/{id}/attend + counts; feed additions
- [done] RB7 Public profile: GET /api/users/{id}
- [done] RB8 Round-2 base seed (subletters, listings across statuses, swipes, reviews, attendance)
- [done] RB9 notes.lat/lng + GET/POST /api/map/comments
- [done] RB10 comments table + RLS + GET/POST /api/events/{id}/comments
- [done] RB11 event_attendance as going Y/N; POST /api/events/{id}/attend { going } -> { going, viewerGoing }
- [done] RB12 friendships table + RLS + friends API (list, requests, request/accept/decline)
- [done] RB13 GET /api/friends/notes (accepted friends joined with event_attendance)
- [done] RB14 /api/route/pois + /api/route/schedule

### Integrations + AI
- [done] RC1 Sourcing pipeline: SourceAdapter interface + seed adapter + normalize + dedupe + ingest + admin trigger route
- [done] RC2 Freshness jobs: expiry pass + "still available?" ping dispatch
- [done] RC3 Ticketmaster integration: Discovery API client + GET /api/events/nearby + upsert + seeded fallback
- [done] RC4 Offer parser hardening: broader formats + OCR + per-field confidence/needsReview
- [done] RC5 Seed sourced listings via the adapter
- [done] RC6 POST /api/route: Mapbox Directions polyline + distance/duration + seeded fallback
- [done] RC7 Office geocode from employer
- [done] RC8 POI search along the route corridor (Mapbox) for coffee/gym candidates

## Round 3 (shipped, merged to main 2026-07-17)

All three implementation streams (person-a UI + person-b schema/APIs + person-c integrations) are integrated and merged to `main`. Automated gates and local Supabase verification are green: full suite passing incl. 28 RLS tests on Postgres, production build clean, no client-bundle secret leak. The one remaining fixture-browser gap is a real Mapbox marker-click pass (RA38), which requires `NEXT_PUBLIC_MAPBOX_TOKEN` and is picked up in Round 4 (RA45). Full evidence is in `docs/SPRINT-3-ACCEPTANCE.md`.

### Experience
- [verified 2026-07-17] RA31 Ticketmaster event image renders on the feed card (+ placeholder fallback)
- [verified 2026-07-17] RA32 Comprehensive sublet detail sheet: furnished line, Pros list, bed/bath/sqft, amenities, utilities; add the fields to the post form
- [verified 2026-07-17] RA33 Roommate grouping UI: pending invite, invitee acceptance, and confirmed grouped view
- [verified 2026-07-17] RA34 Booking flow UI: Request-to-book, owner approval inbox, booked state, and immediate removal from the deck
- [verified 2026-07-17] RA35 Finance UI: take-home vs salary, cost-of-living, upfront cash, relocation stipend (onboarding summary + landing readout + perch affordability)
- [verified 2026-07-17] RA36 Checklist UI: fuller checklist grouped by category (travel, logistics, packing, admin) with per-group progress
- [verified 2026-07-17] RA37 Onboarding percentages removed (confidence percent -> "check this" flag; step dots replace the percent bar)
- [wip] RA38 Map marker press -> richer info sheet. Payload tests pass and the no-token fallback renders; a real Mapbox marker-click pass remains unverified.

### Schema + core APIs
- [verified 2026-07-17] RB31 listings columns (0011): furnished, pros, bedrooms, bathrooms, sqft, amenities, utilities_included (nullable + backfilled) + GET /api/listings/{id} (ListingDetail) + post validation for the new fields
- [verified 2026-07-17] RB32 bookings table (0011) + RLS (0012) + deterministic state machine (requested -> approved -> booked; booked sets listings.status=taken; decline/cancel release) + booking API (book/approve/decline/confirm/list)
- [verified 2026-07-17] RB33 Roommate grouping: bookings.roommate_ids + roommate_invites; invite/accept API; friend-or-invited enforced in code + RLS trigger
- [verified 2026-07-17] RB34 Finance model (deterministic): progressive federal brackets + FICA + state estimate take-home, COL-adjusted budget, upfront cash, stipend/bonus; cost_of_living table; GET /api/finance; negotiation budget scout uses take-home + COL (never raw salary)
- [verified 2026-07-17] RB35 Checklist seed: flights, shipping/movers, what-to-bring (packing), parking/car + category column (travel/logistics/packing/admin)
- [verified 2026-07-17] RB36 Feed/events guard datetime >= now (upcoming only, in-query); marker payloads carry detail for the map info sheet (ListingDetail furnished/pros/status; map comments author/text; events venue/date/going)

### Integration decisions, integrations, and parser
- [verified 2026-07-17] C0 reconciled the integrated Person A/B seams before RC implementation: RC31/RC32 retained, RC33 reduced to the canonical integrated source, and RC34 closed as no-build unless a missing payload was demonstrated.
- [verified 2026-07-17] RC31 Ticketmaster: upcoming-only filter (startDateTime >= now, sorted ascending) + capture best image_url
- [verified 2026-07-17] RC32 Offer parser: extract relocationStipend + signingBonus (upfront cash) with per-field confidence, null absent values, and flag ambiguous values for review
- [verified 2026-07-17] RC33 Cost-of-living data source: hardened the integrated lookup as the canonical seam; city/state canonicalization, deterministic DB-error/malformed-row fallback, documented bundled provenance/as-of date, no external provider or duplicate persistence path
- [verified 2026-07-17] RC34 closed as not needed: existing payloads and routes support the accepted marker-sheet behavior; no external Mapbox place-details route, key, provider, or abstraction was added. The separate RA38 real-browser Mapbox gate remains open.

## Round 4 - Live backend: Supabase provisioning + go-live (planned 2026-07-17)

Two-way split (no new product features): take the fixture-first app to a real, logged-in,
deployed Supabase backend. Seams: FOUNDATION-CONTRACT.md section 14. Plans:
IMPLEMENTATION-PERSON-A-ROUND4.md, IMPLEMENTATION-PERSON-B-ROUND4.md. Branches:
round4-person-a, round4-person-b (each restarted from main).

### Client / auth session / deploy (person-a)
- [todo] RA41 middleware.ts: SSR auth session refresh (@supabase/ssr) + matcher; keeps a live session fresh across navigation (fixture-safe no-op when unconfigured)
- [todo] RA42 Auth flow: login persists a real session, sign-out, protected-route redirects, a current-user hook from the live session
- [todo] RA43 Fixture-to-live flip: every lib/data/source.ts getter hits live on DATA_SOURCE=live and falls back to fixture on error (no broken screens)
- [todo] RA44 Realtime DMs live against the hosted project (reuse the optimistic reconcile)
- [todo] RA45 Mapbox live token wiring (map renders real tiles; placeholder fallback kept)
- [todo] RA46 Storage upload UI: listing photos + profile avatar to the Supabase bucket, via public/signed URLs
- [blocked 2026-07-18] RA47 Vercel deploy: no preview URL or hosted smoke evidence yet. The local Vercel CLI is authenticated, but the active seo23 scope has no Vercel project and this checkout is not linked. Hosted acceptance also waits for Person B's provisioned/migrated/seeded project, Preview server env, Storage policy handoff, live RLS evidence, and RB47 fallback evidence. Fixture mode remains the working fallback.

### Hosted DB / server / secrets (person-b)

Mode note: no hosted Supabase credentials were provided, so Person B ran in LOCAL
mode - a throwaway Postgres on :54322 - to prove the migrate/seed/RLS/storage path
end to end. The same scripts run unchanged against a hosted project once its keys
are in `.env.local`; the hosted push is a one-command step (`npm run db:push:live`
then `npm run seed:live`). Full steps: `docs/RUNBOOK-LIVE-BACKEND.md`.

- [verified 2026-07-17] RB41 `scripts/db-push.ts` (`db:push` / `db:push:live`) applies all 12 migrations in order over `SUPABASE_DB_URL`, tracked in `perch_meta.applied_migrations` (re-run is a no-op); verifies 15 tables / 52 functions / 10 triggers, forced RLS on every public table, and the three storage buckets. `db:push:live` refuses a non-hosted URL. Verified against fresh local Postgres (apply -> 12 applied; re-run -> 0 applied).
- [verified 2026-07-17] RB42 Seed is idempotent. `scripts/seed.ts` (`seed:live`) is the hosted seeder (GoTrue users with the `perch-demo-<email>` password seam, service-role upserts) with a `SEED_REQUIRE_HOSTED` guardrail. `scripts/seed-direct.ts` (`seed:local`) is the LOCAL equivalent over `pg` (deterministic ids, no GoTrue passwords). Verified: re-running seed:local leaves identical row counts.
- [verified 2026-07-17] RB43 `.env.example` current incl. server-only `SUPABASE_DB_URL` / `SUPABASE_ACCESS_TOKEN`; no `NEXT_PUBLIC_` secret in source; production build clean and `.next/static` secret grep clean.
- [verified 2026-07-17] RB44 Live RLS on a real DB: 28 adversarial cases (`tests/rls.test.ts`) + a human-readable two-user isolation demo (`scripts/rls-acceptance.ts`, `rls:acceptance`) - a stranger reads zero of another user's DMs/bookings, cannot inject a message, and anon reads zero users. All pass on local Postgres; the same suite points at `SUPABASE_DB_URL` for the hosted run.
- [verified 2026-07-17] RB45 `getCallerId()` resolves `auth.uid()` from the request cookies (session-only, never the body). `tests/guard.test.ts`: guard() 401s an unauthenticated/errored request, returns the caller id + rate headers when authenticated, and 429s once the per-caller window is exhausted.
- [verified 2026-07-17] RB46 Storage buckets + policies (migration 0005). `tests/storage-buckets.test.ts`: the three buckets exist with the right public flags, the four named object policies are declared, and the `{uid}/` prefix rule gates offer-letter/takeout writes and reads under enforced RLS.
- [verified 2026-07-17] RB47 Kill switches deterministic by default. `tests/kill-switches.test.ts`: `isLlmEnabled()`/`isComposioEnabled()` are false unless a key is present and the switch is off; the fixture taste fallback loads with no key (no crash). Rate-limit envs covered by `tests/ratelimit.test.ts`.

Remaining for the hosted project (needs the owner's Supabase keys in `.env.local`):
run `npm run db:push:live` then `npm run seed:live`, hand Person A the URL + anon key,
then `RUN_RLS_TESTS=1 RLS_TEST_DATABASE_URL="$SUPABASE_DB_URL" npm run rls:test` and the
`tests/auth-live.test.ts` login smoke. See the runbook.

## Round 5 - Growth, live events, LLM parsing, bird theme (planned 2026-07-20)

Four-way split of new product work, planned while Round 4 (live backend) is still in
flight. Seams: FOUNDATION-CONTRACT.md section 15. Plans:
IMPLEMENTATION-PERSON-{A,B,C,D}-ROUND5.md. Branches: round5-person-a, round5-person-b,
round5-person-c, round5-person-d (each cut from main).

### Onboarding growth (person-a)
- [verified] RA51 Recommended-friends "find your flock" onboarding step (reuses getMatches + requestFriend; optimistic add; skippable)
- [verified] RA52 Optional profile-picture step (local preview in fixture, storage helper only when Supabase is configured; skip in one tap; nothing requires an avatar)
- [verified] RA53 Shared InitialsAvatar (initials on a token background) swept across every avatar render site; a null/empty/broken avatar_url never breaks a surface

### Live event polling on Vercel (person-b)
- [todo] RB51 Shared ingest core (lib/events/ingest.ts) + guarded /api/cron/ingest-events route (CRON_SECRET)
- [todo] RB52 vercel.json crons (ingest-events + existing expire-listings) + cooldown-gated on-request refresh
- [todo] RB53 Retire the workflow's Ticketmaster step (seed stays) + deployed verification with evidence

### OpenAI offer parsing (person-c)
- [done] RC51 LLM-first extraction: generateObject over extracted text, OfferParse-shaped schema (lib/parsers/offerLlm.ts)
- [done] RC52 Deterministic verification layer (verbatim-in-source rule) + pipeline merge order; byte-identical fallback when disabled (lib/parsers/offerVerify.ts, app/api/parse/offer/route.ts)
- [done] RC53 Real-PDF regression fixtures (incl. scanned OCR + adversarial case) + mocked e2e + one LIVE_LLM smoke (tests/fixtures/offers/, tests/offer-llm-pipeline.test.ts, tests/offer-llm-live.test.ts)

### Bird theme (person-d)
- [verified] RD51 Nav renames: DMs -> Chirps, Map -> Migration, Profile -> Nest (labels/subtitles only; routes frozen). Feed/Perches also read their bird words (Flyway/Perches). DMs + Map page/loading headers swept; nav-labels test guards labels + subtitles + frozen hrefs.
- [verified] RD52 Drawn branch/tree motif on emotional surfaces only (flat vector, no SVG filters, aria-hidden, pointer-events-none, static). components/theme/BranchMotif.tsx on the SideRail edge, onboarding backdrop, Chirps empty state, and login/landing; absent from listings/booking/finance/safety/map canvas. Constraint test added.
- [verified] RD53 Glossary (contract section 10: Chirps/Migration/Nest + naming-contract note) + README nav-label parentheticals + plain-ASCII kept throughout.

## Log

- 2026-07-16: Round 1 merged to main.
- 2026-07-16: Round 2 planned and split three ways.
- 2026-07-16: Round 2 batch 2 planned.
- 2026-07-16: Round 2 fully shipped and merged to main. Implementation docs removed; keeping FOUNDATION-CONTRACT.md, PROGRESS.md, SECRETS.md, README.md, CLAUDE.md.
- 2026-07-16: Round 3 planned (upcoming events + images, comprehensive sublet details + pros + furnished, roommate grouping, booking flow, real finance model, fuller checklist, onboarding-percentage removal, richer map info); split three ways on branches person-a/person-b/person-c.
- 2026-07-17: Round 4 Person B (RB41-RB47) built on branch round4-person-b, verified in LOCAL mode (throwaway Postgres): idempotent migrate (db:push) + seed (seed:local/seed:live guardrail), 28 RLS + 5 storage-policy tests green on real Postgres, guard 401/429 + kill-switch tests green, build clean with no client-bundle secret leak. Runbook added (docs/RUNBOOK-LIVE-BACKEND.md). Hosted push pending the owner's Supabase keys.
- 2026-07-16: Round 3 UI (person-a, RA31-RA38) shipped on branch person-a. Fixture-first: booking state machine, roommate grouping, finance breakdown, and richer marker sheets all drivable end-to-end without waiting on B/C. Extended lib/types/contract.ts with the frozen R3 shapes (ListingDetail, Booking, FinanceBreakdown, ChecklistCategory) and lib/data/source.ts with the matching getters so the live-swap stays invisible.
- 2026-07-17: Round 3 person-b shipped (RB31-RB36): migrations 0011/0012 (listing detail columns, bookings + roommate grouping, checklist category, finance inputs, cost_of_living), deterministic finance model + GET /api/finance, booking state machine + API, comprehensive GET /api/listings/{id}, upcoming-only feed/events guard, round-3 seed. RLS adversarial cases for bookings/roommates/cost_of_living pass against Postgres (28 RLS tests green); full suite 300 passing. Decisions: roommate invites require an accepted friend (enforced in code + a DB trigger) and the invitee accepts to become a confirmed roommate; the finance take-home uses documented 2025 single-filer brackets + FICA + a flat 5% state estimate; a cost_of_living table is B-owned (Person C may back a richer lookup with it); optional users.offer_salary/relocation_stipend/signing_bonus persist the offer for /api/finance.
- 2026-07-17: RC34 closed as a documentation-only no-build decision. Verification: Person A's RA38 sheets are present for listings, events, comments, and stickers, life-map places already show kind plus nearest-listing minutes, Person B's marker payload work is recorded as done, and neither the Person A nor Person B Round 3 plan asks for external Mapbox place details. Existing payloads and routes satisfy the accepted map-sheet behavior, so no API route, key, provider, or speculative abstraction was added.
- 2026-07-17: Final integrated acceptance: focused suite 155 of 155 tests passing across 19 files; full suite 325 of 326 tests passing across 46 passing files with 1 live-auth test/file skipped; typecheck and lint clean; production build passed with the existing dynamic OCR dependency warning; local database reset, 28 RLS tests, and idempotent seed passed. Browser acceptance passed all fixture flows except real Mapbox marker clicks because no public Mapbox token was configured. Round 3 remains a release candidate until that browser pass and merge to `main`.
- 2026-07-17: Round 3 (person-a UI + person-b schema/APIs + person-c integrations) integrated and merged to main. Full suite green incl. 28 RLS tests on Postgres; production build clean; no client-bundle secret leak.
- 2026-07-17: Round 4 planned (live backend: Supabase provisioning + go-live). Two-way split A/B on branches round4-person-a / round4-person-b; contract section 14; per-person plans in IMPLEMENTATION-PERSON-{A,B}-ROUND4.md. No new product features - the app moves from fixture-first to a real hosted Supabase project with live auth sessions, RLS verified on the real DB, Realtime + Storage live, and a Vercel deploy.
- 2026-07-20: Round 5 planned (recommended friends + optional avatars in onboarding, live Ticketmaster polling on Vercel, OpenAI-first offer parsing with deterministic verification, bird-theme renames + branch motif). Four-way split on branches round5-person-{a,b,c,d}; seams in contract section 15; plans in IMPLEMENTATION-PERSON-{A,B,C,D}-ROUND5.md. Stale merged branches (person-a/b/c, sprint-3-person-c, claude/person-b-round2-build) removed.
- 2026-07-20: Round 5 person-a (RA51-RA53) verified on branch round5-person-a. Shared InitialsAvatar replaces the Radix Avatar triad across all 13 render sites so a null/empty/broken avatar_url renders initials on a token background instead of a broken image; a skippable "find your flock" onboarding step recommends 3-6 interns (same company first, then same-city overlapping move-in) via getMatches + requestFriend with an optimistic add; an optional Photo step previews locally in fixture mode and calls the storage helper only when Supabase is configured. Fixture-first (zero keys), plain ASCII. Full suite 388 passing (6 skipped), typecheck and lint clean. Not merged.
- 2026-07-20: Round 5 person-c shipped on branch round5-person-c (RC51-RC53). Offer parsing is LLM-first with deterministic trust: offerLlm.ts runs generateObject over the already-extracted PDF/OCR text into an OfferParse-shaped schema; offerVerify.ts re-checks every value against the source (numbers modulo $/comma/decimal, dates via parse-equivalence, employer/role/city as substrings) and nulls + flags anything ungrounded; the /api/parse/offer route merges verified LLM values over null/low-confidence heuristics while never overwriting a verified heuristic value. The whole LLM branch is gated on isLlmEnabled(), so LLM_DISABLED=1 or no key is byte-identical to the heuristics and any model error falls back to them. Five real-shaped PDF fixtures (classic, table, stipend+bonus, scanned/OCR, adversarial-salary-twice) drive the route with the model mocked (default run spends zero tokens); one opt-in live smoke is gated on LIVE_LLM=1. Full suite green, typecheck + lint clean. OfferParse contract shape unchanged; no onboarding steps added and nav/labels untouched.
- 2026-07-20: Round 5 Person D (RD51-RD53) built on branch round5-person-d (isolated worktree; the shared checkout was racing branch pointers across agents). Bird-word nav labels with plain subtitles (Flyway/Perches/Migration/Chirps/Nest), routes frozen; DMs + Map headers swept; a flat-vector BranchMotif on emotional surfaces only (SideRail edge, onboarding backdrop, Chirps empty state, login/landing) and deliberately absent from decision surfaces; glossary + README updated. Verified in isolation on the round-5 planning base: typecheck + lint clean, full test suite green, production build clean. Not merged to main.
- 2026-07-18: RA47 deployment handoff checked. Vercel CLI is authenticated, but the active seo23 scope has no Vercel project and this checkout is not linked, so no Preview URL or hosted smoke test was performed. Hosted acceptance remains blocked on project creation or linking and Person B's RB41-RB47 handoff. README records the exact public-env and smoke-test sequence; no secrets, migrations, seed paths, Storage policies, or product shapes were changed.
