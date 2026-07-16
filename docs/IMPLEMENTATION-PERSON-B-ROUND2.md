# Perch Round 2 - Implementation Plan: PERSON B (Schema + Core CRUD APIs)

Mission: own the round-2 database and the synchronous request/response API routes for the core social and housing data - migrations, RLS, and the CRUD routes behind the swipe deck, subletter posting, reviews, attendance, and public profiles. Person A renders it; Person C builds the pipelines and integrations that run ON TOP of your schema.

Branch: person-b. You are Person B. Round 2 is split THREE ways: A = all UI, B = schema + core CRUD APIs (you), C = integrations + AI (sourcing pipeline + freshness jobs, Ticketmaster, OCR parser).

Boundary with Person C: you own the database (migrations, RLS, seed) and the synchronous CRUD routes. C owns anything that reaches out (third-party APIs), runs in the background (jobs, ingest), or does AI/heuristic parsing. When C needs a column, you add it (schema is yours). C's pipeline keeps your rows fresh; your routes read them.

Read together, do not restate them:
- docs/FOUNDATION-CONTRACT.md section 11 (frozen tables, routes, types) and the ownership map 11.11.
- docs/IMPLEMENTATION-PERSON-C-ROUND2.md (the pipelines/integrations that fill your tables) and docs/IMPLEMENTATION-PERSON-A-ROUND2.md (who consumes your routes).
- Your v1 plan docs/IMPLEMENTATION-PERSON-B.md and the shipped code (supabase/migrations, lib/, app/api).

Working agreements (contract 11.12): plain ASCII only; update README + docs/PROGRESS.md every merge; add round-2 types (11.10) to lib/types/contract.ts in the same PR; RLS is default-deny and adversarially tested; every route is rate-limited; secrets stay in gitignored .env. Determinism carries over: aggregation, counts, and freshness filters are code, never the model.

---

## 1. Scope - what Person B owns in round 2

- RB1 Migration: schema growth. users.user_type ('intern' | 'subletter', default 'intern', CHECK). listings gains status, expires_at, last_confirmed_at, sourced, source_name, source_url, external_id (contract 11.1, 11.2). You own the COLUMNS; Person C's pipeline writes sourced rows and maintains freshness. Backfill existing rows (status='available', sourced=false, source_name='seed').
- RB2 New tables + RLS: listing_swipes (unique user+listing; RLS scoped to owner), reviews (unique subject+reviewer; rating 1..5 CHECK; readable by all authed, writable only by the reviewer AND only if intern), event_attendance (unique event+user; readable for counts, writable by owner). Extend tests/rls.test.ts with the new negative cases.
- RB3 Perches API: GET /api/perches (rank FRESH listings only - status='available' AND (expires_at is null OR expires_at > now()) - excluding already-swiped, enriched with reviewSummary + host -> PerchDeckResponse); POST /api/perches/swipe (idempotent per user+listing; 'right' = saved); GET /api/perches/saved (right-swipes as PerchCard[]). Filter freshness in the query itself so a stale row never leaks even if C's job is mid-run.
- RB4 Subletter posting: POST /api/listings (subletter-only; validate PostListingInput; set sourced=false, source_name='subletter', status='available', initial expires_at); POST /api/listings/{id}/confirm (owner-only; set last_confirmed_at=now(), status='available', bump expires_at). These are synchronous routes; C owns the background expiry job that flips rows to stale.
- RB5 Reviews API: GET /api/reviews?subjectType=&subjectId= (reviews + summary { avgRating, count } via deterministic aggregation); POST /api/reviews (create-or-update the caller's review; intern-only; rating 1..5).
- RB6 Attendance API: POST /api/events/{id}/attend (toggle going/interested/none; return AttendResponse { internsGoing, viewerGoing }); attendance-count aggregation; extend GET /api/feed (lib/scoring/feed.ts) with internsGoing, viewerGoing, and the event venue/url/imageUrl/priceRange fields (C's Ticketmaster upsert fills those columns; you read them).
- RB7 Public profile: GET /api/users/{id} -> PublicProfile (public fields only, user_type, banded, reviewSummary for subletters).
- RB8 Mappable metadata + base seed: ensure events/listings/places/stickers each expose a kind/category the map UI maps to an icon. Extend scripts/seed.ts with round-2 base data: some subletter users; subletter-posted listings across statuses (one near expiry); swipes; reviews (clearly demo content); attendance. Sourced listings and Ticketmaster-shaped events are seeded by Person C's adapter/integration; coordinate so seeds do not collide.

### NOT yours
- Person A (docs/IMPLEMENTATION-PERSON-A-ROUND2.md): all UI - swipe deck, saved tray, post form, freshness badges + confirm affordance, reviews composer/lists/badges, tappable profiles, map icons + legend, event card attendance UI, offer manual-correction UI.
- Person C (docs/IMPLEMENTATION-PERSON-C-ROUND2.md): the sourcing pipeline + adapter + ingest + dedupe; the freshness expiry job + "still available?" ping dispatch (you own only the synchronous confirm route); the Ticketmaster client + GET /api/events/nearby + events upsert; the offer parser hardening (OCR + broader formats + confidence/needsReview). You provide the schema these write into; you do not build them.

---

## 2. What you depend on / expose

- You EXPOSE to A (consumed as frozen shapes, contract 11.10): GET /api/perches, POST /api/perches/swipe, GET /api/perches/saved, POST /api/listings, POST /api/listings/{id}/confirm, GET/POST /api/reviews, POST /api/events/{id}/attend, feed additions, GET /api/users/{id}.
- You EXPOSE to C: the schema. C's pipeline inserts sourced listings and Ticketmaster events into YOUR tables and columns; agree the column set (contract 11.1, 11.2, 11.6) before C writes.
- You CONSUME from C: populated events (so /attend + feed have real events) and freshness upkeep (C's job sets stale; you also guard in-query). Neither blocks you: seed a few events + listings yourself so your routes work before C's pipeline lands.
- Add the round-2 types (contract 11.10) to lib/types/contract.ts if not already present; ship each route as a typed stub returning the frozen shape from seed first, so A swaps fixture -> live with no code change.

---

## 3. Repo additions (extend the shipped tree)

```
supabase/migrations/
  0006_round2_columns.sql        # RB1: user_type + listings freshness/sourcing columns (+ backfill)
  0007_round2_tables.sql         # RB2: listing_swipes, reviews, event_attendance (+ indexes)
  0008_round2_rls.sql            # RB2: enable + policies for the new tables
lib/reviews/aggregate.ts         # RB5 deterministic avg/count
app/api/perches/route.ts                     # RB3 GET deck (fresh-only)
app/api/perches/swipe/route.ts               # RB3 POST swipe
app/api/perches/saved/route.ts               # RB3 GET saved
app/api/listings/route.ts                    # RB4 POST create (subletter)
app/api/listings/[id]/confirm/route.ts       # RB4 POST confirm (owner)
app/api/reviews/route.ts                     # RB5 GET + POST
app/api/events/[id]/attend/route.ts          # RB6 POST attend
app/api/users/[id]/route.ts                  # RB7 GET public profile
scripts/seed.ts                              # RB8 extend base seed
```
Rate-limit every new route via lib/llm/ratelimit.ts (or a shared limiter). Add the round-2 types to lib/types/contract.ts.

---

## 4. Build phases (test-first; commit after each; update PROGRESS.md + README each merge)

### Phase R2B-1 - Migrations + RLS (RB1, RB2) - security-critical, do first
- 0006: users.user_type; listings freshness/sourcing columns; backfill; unique (source_name, external_id) where sourced.
- 0007: listing_swipes, reviews, event_attendance with unique constraints + indexes.
- 0008: enable RLS + least-privilege policies (owner-only swipe/attendance; reviewer-only + intern-only review; subletter owns only their listings).
- Extend tests/rls.test.ts: cross-user swipe/attendance/review writes denied; non-intern review denied; foreign subletter listing edit denied.
- Acceptance: supabase db reset clean; RLS tests green incl. new negatives. Publish the column set to Person C.

### Phase R2B-2 - Perches API + posting + confirm (RB3, RB4)
- GET /api/perches: fresh-only in-query filter, exclude swiped, enrich with reviewSummary + host, deterministic ranking. POST /api/perches/swipe: idempotent upsert. GET /api/perches/saved: right-swipes.
- POST /api/listings: subletter-only create. POST /api/listings/{id}/confirm: owner-only refresh (last_confirmed_at, status, expires_at bump).
- Acceptance: deck excludes swiped + stale/expired rows; swipes idempotent; subletter can post + confirm; intern cannot post; RLS blocks cross-user writes.

### Phase R2B-3 - Reviews + attendance + profile (RB5, RB6, RB7)
- GET/POST /api/reviews with deterministic summary; intern-only writes; update-not-duplicate per (subject, reviewer).
- POST /api/events/{id}/attend toggling event_attendance; extend GET /api/feed with internsGoing/viewerGoing + event venue/url/imageUrl/priceRange (read the columns C fills).
- GET /api/users/{id} -> PublicProfile with reviewSummary for subletters.
- Acceptance: review average/count correct; a second review updates; attend toggles the count; feed carries new fields; profile returns a subletter summary.

### Phase R2B-4 - Base seed + metadata (RB8)
- Extend scripts/seed.ts with subletters, subletter listings across statuses (one near expiry), swipes, reviews, attendance. Ensure kind/category present on mappable rows. Coordinate with C so sourced listings + Ticketmaster events do not duplicate your seed.
- Acceptance: npm run seed idempotent; every A surface looks alive on seed; no seed collisions with C's pipeline output.

---

## 5. Definition of done + demo checklist

Done when:
- Migrations build clean; RLS tests green (user_type, listing_swipes, reviews, event_attendance; cross-user writes denied; non-intern review blocked; foreign subletter edit blocked).
- /api/perches (fresh-only), /api/perches/swipe, /api/perches/saved, /api/listings, /api/listings/{id}/confirm, /api/reviews, /api/events/{id}/attend, /api/users/{id} return frozen shapes and are rate-limited.
- Feed carries internsGoing/viewerGoing + event fields; review summaries and attendance counts are correct.
- Base seed makes every A surface look alive; README + PROGRESS.md updated each merge.

Demo checklist (drive it):
1. Swipe endpoints record right/left; saved returns right-swipes; deck excludes swiped + stale.
2. Post a sublease as a subletter; confirm it; reject the post as an intern (RLS).
3. Post a review; fetch reviews + summary; block a non-intern review.
4. Attend an event; the count changes; feed shows the new fields.
5. Fetch a subletter public profile with its review summary.

---

## 6. Integration checkpoints

- With Person C (schema handshake): agree the listings freshness/sourcing columns and the events Ticketmaster columns BEFORE C writes to them; schema changes go through the contract first, and you own the migration.
- With Person C (freshness): your perches route guards freshness in-query; C's expiry job sets stale. Confirm the boundary so a stale row never surfaces.
- With Person A (route stubs first): ship each route as a typed stub from seed so A never blocks.
- With Person A (RLS gates): confirm review/attendance/swipe/listing policies are deployed before A demos writes on live.
- Every merge to main: update README + PROGRESS.md.

---

## 7. Round 2 - Batch 2 (additional schema + core APIs, contract section 12)

Still Round 2. Frozen shapes in FOUNDATION-CONTRACT.md section 12. Same rules: default-deny RLS, rate-limited routes, deterministic aggregation, add the section 12.7 types to lib/types/contract.ts. Person C owns the Mapbox Directions route (POST /api/route), the office geocode, and POI search; you own the deterministic and CRUD pieces.

- RB9 Map comments. Migration: notes gains lat, lng (nullable). Routes: GET /api/map/comments?bbox=... (notes with lat/lng in the viewport, joined with author) and POST /api/map/comments { lat, lng, topic, body } (author = auth.uid()). RLS: authed read, author-only write.
- RB10 Event comments. Migration: comments table (id, event_id fk, author_id fk, body, created_at) + RLS (authed read, author-only write). Routes: GET/POST /api/events/{id}/comments (EventComment / EventCommentsResponse).
- RB11 Going Y/N poll + feed pictures. Change POST /api/events/{id}/attend to accept { going: boolean } and return { going, viewerGoing } (this is the FINAL AttendResponse, revising section 11.10). A row in event_attendance = going. Extend GET /api/feed to pass through events.image_url (populated by C's Ticketmaster upsert) and the going count.
- RB12 Friends. Migration: friendships (id, requester_id, addressee_id, status pending|accepted, created_at; unique(requester, addressee)) + RLS (only the two participants). Routes: GET /api/friends, GET /api/friends/requests, POST /api/friends/request, POST /api/friends/{id}/accept, POST /api/friends/{id}/decline.
- RB13 DMs Notes API. GET /api/friends/notes -> FriendNote[] by joining accepted friendships with event_attendance (going) and the events. Deterministic; rate-limited.
- RB14 Route POIs + schedule. POST /api/route/pois { geometry, kinds } -> RoutePoi[] via a deterministic point-to-polyline distance over the user's places (candidates beyond the user's places come from C's POI search). POST /api/route/schedule { apartmentId, selectedPlaceIds } -> a day schedule (extends the itinerary engine, reuse ItineraryDay). Optional commute_plans table (user_id, listing_id, office_lat/lng, selected_place_ids[], created_at) if the plan should persist; mark optional.

Boundary reminder: you build ON C's route. C returns the geometry (POST /api/route); you compute which POIs lie along it and the schedule. You do NOT call Mapbox Directions - that is C.

Acceptance (batch 2): notes carry lat/lng and the map-comments routes work; event comments + the going Y/N poll return frozen shapes; feed carries image_url + going count; friendships + friends routes enforce participant RLS; /api/friends/notes returns friends' event plans; /api/route/pois is deterministic and /api/route/schedule returns a day. RLS tests extended; routes rate-limited; README + PROGRESS.md updated on merge.
