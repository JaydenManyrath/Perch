# Perch - System Architecture

End-to-end reference for the whole system: what runs where, how data flows, and the
rules the implementation follows. Plain ASCII throughout.

## 1. What Perch is

The social network interns use to land in a new city. Two connection types drive
everything:

1. Intern to intern - find people at your company or in your city moving in the same
   window, for roommates, friends, and going out ("your flock").
2. Intern to subleaser - short-term sublets that fit a ~10-week internship, in a
   market that mostly assumes 12-month leases.

Every other surface (taste-matched events feed, life map, commute planning, finance
breakdown, checklist, itinerary) exists to warm up and inform those connections. The
UX is Instagram-shaped: feed, swipe deck, map, DMs, profile.

## 2. Stack

| Layer | Choice |
|---|---|
| Framework | Next.js (App Router) + TypeScript, one repo for UI + API routes |
| Styling | Tailwind CSS with the token palette in tailwind.config.ts |
| Components | shadcn/ui primitives |
| Motion | Framer Motion |
| Database / Auth / Realtime / Storage | Supabase (Postgres) - one managed service, four jobs |
| LLM | OpenAI via the Vercel AI SDK (structured output; narration + extraction only) |
| Events | Ticketmaster Discovery API |
| Map | Mapbox GL + Directions + Geocoding |
| OAuth connections | Composio (Spotify; optional) |
| Hosting | Vercel (functions + crons) |

## 3. High-level flow

```
+---------------------------------------------------------------+
|                     CLIENT (Next.js/React)                    |
|   Flyway feed - Perches deck - Migration map - Chirps DMs -   |
|   Nest profile - onboarding - negotiation                     |
+-------------------+---------------------------+---------------+
                    |                           |
        Supabase JS client            Next.js API routes (/api/*)
        (auth session, reads,                   |
         Realtime, Storage)                     |
                    v                           v
            +--------------+   +--------+  +---------+  +--------+
            |   SUPABASE   |   | OpenAI |  | Ticket- |  | Mapbox |
            | Postgres/RLS |   | (AI    |  | master  |  |        |
            | Auth/Realtime|   |  SDK)  |  |Discovery|  |        |
            | Storage      |   +--------+  +---------+  +--------+
            +--------------+
```

The client talks to Supabase directly for auth, reads, Realtime, and Storage. Anything
needing a secret or server logic (LLM calls, Ticketmaster, parsing, account minting,
admin writes) goes through an API route.

## 4. Data source switch (fixture vs live)

`lib/data/source.ts` is the single data layer the UI calls. It reads
`NEXT_PUBLIC_DATA_SOURCE` (`fixture` | `live`, default `fixture`):

- fixture: every getter serves deterministic in-memory fixtures, so the whole app is
  demoable with zero keys.
- live: getters call the real API routes / Supabase and FALL BACK to the fixture on any
  error or missing key. Flipping to live must never turn a missing key into a broken
  screen - this graceful-fallback rule is non-negotiable and applies to every surface.

`lib/data/server-source.ts` mirrors the same contract for server components using the
cookie-bound session client.

## 5. Data model (Postgres)

Core tables (see supabase/migrations/ for the authoritative DDL):

- users - id (= auth.users.id), name, company, role, city, move_in_date,
  taste_profile jsonb, verified ("banded"), avatar_url, user_type (intern | subletter),
  offer_salary, relocation_stipend, signing_bonus
- listings - sublets: title, address, lat/lng, price, lease window + type, photos,
  safety_flags, status (available/pending/taken/stale), expires_at, last_confirmed_at,
  sourcing fields (sourced, source_name, source_url, external_id), detail fields
  (furnished, pros, bedrooms, bathrooms, sqft, amenities, utilities_included)
- listing_swipes - per-user right/left swipes backing the deck + saved tray
- bookings - request -> approve -> book state machine; booked flips the listing to
  taken; roommate_ids + roommate_invites for grouping
- reviews - 1-5 stars + text against a listing or a subletter
- events - id (deterministic for external rows), source ('seed' | 'ticketmaster'),
  external_id, title, category, lat/lng, datetime, url, venue, image_url, price_range
- event_attendance - going yes/no per user per event
- comments - event comment threads
- notes - map-anchored community comments (lat/lng + topic + body)
- stickers - positive-only map stickers (category CHECK constraint; no "avoid" labels)
- friendships - requester/addressee + status (pending/accepted)
- conversations / messages - DMs; Realtime subscribes to message inserts
- checklist_items - pre-flight checklist rows per user, categorized
  (travel/logistics/packing/admin)
- cost_of_living - city index + median rent backing the finance model

Row-Level Security is enabled and forced on every public table; policies enforce
owner-only writes and participant-only reads (DMs, bookings, swipes). An adversarial
RLS suite (tests/rls.test.ts, 28 cases) runs against a real Postgres.

## 6. Identity: the account comes from the offer letter

Onboarding is the entry point and works BEFORE any session exists:

1. Upload the offer letter (PDF). `/api/parse/offer` allows anonymous callers
   (IP rate-limited) because the parse is what creates the account - requiring auth
   would be circular.
2. Parse pipeline (all server-side): extract text (unpdf; OCR fallback for scans) ->
   deterministic heuristics -> optional LLM pass (structured output) -> verification ->
   merge. The model may READ but may never invent a value: every LLM value must appear
   verbatim in the source text (numbers modulo formatting, dates by parse-equivalence,
   names/employers/cities as substrings) or it is nulled and flagged for review. With
   no key or LLM_DISABLED=1 the output is byte-identical to the heuristics.
3. The correction screen shows every field (including the person's name) with
   low-confidence fields flagged "check this" and editable. A live finance breakdown
   recomputes as fields are corrected.
4. `/api/onboarding/account` mints the account for the person the letter names:
   auth user `<name-slug>@perch.demo` (collision -> numeric suffix) with the shared
   demo password seam, plus a users row carrying the letter's identity and offer
   money fields. verified starts false. NO social graph is created - a new account
   has friends only when they add someone.
5. The browser signs into the minted account; onboarding continues as that user
   (optional photo with initials fallback, recommended-friends step, Takeout, Spotify).
   The current-user layer (`getMe`) resolves the live session row and normalizes
   NULL optional fields, so minted accounts render with their own identity everywhere.

Session plumbing: middleware.ts refreshes the Supabase session via @supabase/ssr on
navigation (fixture-safe no-op when unconfigured); guarded API routes resolve the
caller only from the session cookie (never the request body) and rate-limit per
caller+IP.

## 7. Events pipeline (Ticketmaster, end to end)

1. Fetch: lib/events/ticketmaster.ts calls the Discovery API (keyed, server-only)
   for a city center + radius, upcoming window starting now. Timestamps are
   second-precision (the API rejects fractional seconds).
2. Normalize: pure mapping onto the events columns; every row gets a DETERMINISTIC
   uuid derived from (source, external_id), so upserts conflict on the primary key
   and re-ingesting is idempotent on any database.
3. Image pick precedence: largest non-fallback 16:9 image, else largest non-fallback
   of any ratio, else largest fallback image; null only when nothing has a url.
4. Ingest core (lib/events/ingest.ts): upserts live rows, never writes fallback data,
   and PRUNES ticketmaster rows more than 6h past start on every pass - the table
   self-cleans. Seeded rows are never touched.
5. Triggers: a daily Vercel cron (vercel.json -> /api/cron/ingest-events, bearer-authed
   with CRON_SECRET, fail-closed in production), a daily GitHub Actions backstop, and
   a cooldown-gated on-request refresh (default 6h per city, in-flight guard) fired
   from /api/feed and /api/events/nearby under real traffic.
6. Serving: /api/feed scopes events to the viewer's area (their onboarding city ->
   known-city table -> Mapbox geocode -> Seattle default), filters upcoming-only
   in-query, ranks by Spotify-taste fit, and joins attendance counts. All event-serving
   routes guard upcoming-only; a seeded fallback keeps the feed alive with zero keys.

Event cards and map sheets link out to the real event page in a new tab.

## 8. Sublets, booking, and freshness

- Sourcing pipeline (lib/sourcing/): adapter interface + seed adapter, normalize,
  dedupe, ingest; real third-party scraping is deliberately out of scope.
- Freshness: listings carry status/expires_at/last_confirmed_at; a cron expiry pass
  plus "still available?" confirm/relist keep the deck honest - stale or taken
  listings never surface in the swipe deck.
- Booking: request -> owner approve/decline -> booker confirm -> listing taken and
  dropped from discovery. Roommate grouping requires an accepted friend; the invitee
  accepts to join. Both rules are enforced in code and by RLS triggers.
- Reviews attach to listings or subletters and roll up into rating badges.

## 9. Money: the deterministic finance model

The LLM never does math. lib/finance computes take-home from documented tax brackets
plus FICA and a flat state estimate, a cost-of-living-adjusted rent budget from the
cost_of_living table, and upfront cash (relocation stipend + signing bonus offsets).
The negotiation hero's budget scout uses take-home + COL, never raw salary. The same
model backs onboarding, the landing readout, and per-listing affordability lines.

## 10. Negotiation hero

/negotiate streams scout verdicts per saved listing: deterministic rule code decides
(budget fit, lease window, safety flags, commute), the LLM only narrates the
explanation. Verdict colors are the functional tokens; a listing with scam signals is
always flagged regardless of prose.

## 11. Map and commute

Mapbox GL renders category-icon pins for places, stickers, events, listings, and map
comments, with a legend and rich per-marker info sheets. Choosing an apartment (or
arriving with ?apartmentId=) draws a road-following commute route to the office
(Mapbox Directions; office geocoded from the employer with a seeded fallback), offers
coffee/gym picks along the corridor, and generates a daily schedule from the picks.
Stickers are positive-only by schema constraint - no "avoid this area" labeling.

## 12. Realtime DMs

Sending inserts a row into messages; Supabase Realtime pushes the insert to the other
participant's subscription; the sender renders optimistically and reconciles on the
echo. RLS restricts reads and writes to conversation participants. The DM list carries
a notes strip showing which friends are going to which events (upcoming only).

## 13. Design system

- Palette (tailwind.config.ts, the single source of truth): baby-blue surface ramp
  (sky 50-500), deep-blue ink for text (ink strong/soft/muted), one warm accent
  (beak orange) used sparingly, and UNMUTED functional colors (pass green, flag amber,
  scam red) that are never pastel-ified. Body text is never baby-blue on white.
- Mascot: a round plush chick, flat vector, no heavy SVG filters. It appears only in
  personality moments (onboarding, loading, empty states, milestones) and never on
  decision surfaces (listings, money, safety, map decisions).
- Branch motif: a hand-drawn branch as a faint fixed backdrop BEHIND page content
  (content stacks above it), plus onboarding/login/empty-state corners. Decorative
  only: aria-hidden, no pointer events, absent from decision surfaces.
- Naming: bird words ride alongside plain meaning, subtitled where needed -
  Flyway (feed), Perches (sublet deck), Migration (map), Chirps (DMs), Nest (profile),
  banded (verified), pre-flight (checklist), flock (friends). Route paths stay
  /feed /stories /map /dms /profile so deep links never break.
- Type scale, radii, and shadows are tokens; skeletons shimmer; reduced motion is
  respected.

## 14. Security

- RLS on every table, forced, with adversarial tests; storage buckets have owner-write
  policies with a per-user prefix rule for private uploads.
- Secrets are server-only: the service-role key exists only in lib/supabase/admin.ts,
  seed/ingest scripts, and server routes; nothing secret is NEXT_PUBLIC_; production
  builds are grepped for leaked values.
- Every API route passes a guard: session-resolved caller id (never from the body),
  per-caller+IP sliding-window rate limit. Anonymous-allowed routes (offer parse,
  account mint) rate-limit by IP.
- Cron routes require a CRON_SECRET bearer and fail closed in production.
- Kill switches (LLM_DISABLED, COMPOSIO_DISABLED) keep every deterministic path
  available with no keys, protecting paid endpoints.
- Env reference: docs/SECRETS.md. Deployment checklist: docs/PRODUCTION-READINESS.md.

## 15. Operations

- Seed: scripts/seed.ts is idempotent (stable ids, upserts) and populates a believable
  Seattle cohort - users with the demo password seam, listings across statuses,
  hand-authored events at real venues with images, reviews, friendships, bookings,
  DMs, checklist items. Safe to re-run any time; a daily GitHub Action re-seeds so
  demo data stays fresh and the free-tier database never idle-pauses.
- Event ingest: scripts/ingest-events.ts (same core as the cron route) with a daily
  GitHub Actions backstop; see section 7.
- Migrations: supabase/migrations/ applied in order by scripts/db-push.ts
  (db:push / db:push:live), tracked in perch_meta.applied_migrations; re-runs are
  no-ops. Local development uses supabase db reset.
- Live backend runbook: docs/RUNBOOK-LIVE-BACKEND.md (provision, migrate, seed,
  verify RLS, storage, auth smoke).
- Quality gates: vitest suite (incl. RLS + route-level tests), tsc, next lint,
  production build, and client-bundle secret greps.

## 16. Cost posture

Everything runs on free tiers except OpenAI (cents at demo scale; a cheap default
model, live calls opt-in in tests). Ticketmaster Discovery's free tier allows 5000
calls/day; the ingest design uses at most a handful per city per day.
