# Perch

The social network interns use to land in a new city: find your flock (roommates, friends, people to go out with) and short-term sublets, and get oriented before you arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

Demo build in dev/test mode (no production auth/verification). Full context in [CLAUDE.md](CLAUDE.md).

Docs style: plain ASCII only (no emojis, no em-dashes).

## Status

- Round 1 (v1 app): DONE. The full Instagram-shaped shell on seed/fixture data, plus the streaming housing negotiation and the live intern-connection beat.
- Round 2: DONE. UI + APIs + integrations all merged to `main`.
  - All UI: perches swipe deck + saved tray, subletter posting + freshness confirm, Airbnb-style reviews on perches and on subletter profiles, tappable profiles, Google-Maps-style icons + legend + event pins, event card with picture + venue + Going Y/N poll + comments, offer manual-correction, feed events-only, map comments with placeholders + read/add, friends UI (add + list + requests), DMs Instagram-Notes strip, front-page cleanup, apartment -> office road-following route + along-route POI selection + generated schedule, Message-on-profile.
  - Schema + core APIs: user_type + freshness columns; listing_swipes, reviews, event_attendance, comments, friendships, map-comment notes; API routes for perches (deck/swipe/saved), listings (post/confirm), reviews, event attendance/comments, friends (list/requests/request/accept/decline/notes), map comments, public profiles, route POIs + schedule.
  - Integrations + AI: sourcing pipeline (adapter + normalize + dedupe + ingest), freshness expiry job, "still available?" ping dispatch, Ticketmaster Discovery API + /api/events/nearby + seeded fallback, offer parser hardening (confidence + needsReview + OCR + broader formats), Mapbox Directions POST /api/route + geocode + along-route POI search.

- Round 3: DONE. Merged to `main` 2026-07-17 (person-a UI + person-b schema/APIs + person-c integrations integrated together). Full suite green incl. 28 RLS tests on Postgres, production build clean, no client-bundle secret leak. Evidence in [SPRINT-3-ACCEPTANCE.md](docs/SPRINT-3-ACCEPTANCE.md).
  - Experience: event images with a placeholder fallback, comprehensive perch details and post inputs, the full booking flow, accepted-friend roommate invitations, canonical finance on onboarding/landing/listings, grouped pre-flight checklist, percentage-free onboarding, and marker-specific map sheets.
  - Data and APIs: migrations 0011/0012, booking and roommate state machines with RLS, cost-of-living and persisted offer inputs, comprehensive listing and finance routes, upcoming-only event/feed guards, and canonical affordability in negotiation.
  - Integrations and parser: upcoming Ticketmaster events with usable images, relocation stipend/signing bonus extraction with confidence and review behavior, canonical cost-of-living lookup with deterministic fallback, and RC34 closed as no external place-details integration required.
- Round 4: INTEGRATION BLOCKED (live backend: Supabase provisioning + go-live). No new product features - the app moves from fixture-first to a real hosted Supabase project: SSR auth sessions, RLS verified on the real DB, live Realtime + Storage, and a Vercel deploy. Two-way split A/B on branches `round4-person-a` / `round4-person-b`; plans in `docs/IMPLEMENTATION-PERSON-{A,B}-ROUND4.md`.

Seams are documented in [FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md): sections 11 (round-2 batch 1), 12 (round-2 batch 2), 13 (round 3), and 14 (round 4 - live backend). The `lib/types/contract.ts` file mirrors those shapes verbatim.

## The stack (locked)

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase (DB / Auth / Realtime / Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, deployed on Vercel.

## Run it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill the client keys (Supabase anon URL/key, Mapbox token). Server keys (service role, OpenAI, Composio, Ticketmaster) go in `.env` per [docs/SECRETS.md](docs/SECRETS.md); never commit secrets.
3. `npm run dev`. The app runs on the fixture data source with no live keys; set `NEXT_PUBLIC_DATA_SOURCE=live` to hit the real API routes and Supabase.
4. Supabase (optional for live mode): `supabase db reset` to apply `supabase/migrations`, then `npm run seed` to populate a live DB. `npm run seed:sourcing` seeds via the auto-sourcing pipeline.

## Walkthrough

- `/` splash - Start onboarding.
- `/onboarding` - upload offer -> parsed fields render (low-confidence fields are flagged with a "check this" hint and editable) + live finance breakdown recomputes as you correct them -> Spotify connect (or skip) -> Takeout upload (optional) -> done. Progress is shown as step dots, not a percent.
- `/feed` - events only, ranked to your taste. Each card shows a picture (or a category-labeled placeholder), venue, category, taste-match bar, a Going Y/N poll + intern count, and a comment thread.
- `/stories` (labeled "Perches" in nav) - Tinder-style swipe deck of fresh sublets. Drag or use Pass/Save buttons. Right-swipes populate the Saved tab. Tap a card for the full detail sheet: furnished, pros, bed/bath/sqft, amenities, utilities, host + reviews, affordability line vs your take-home, and Request-to-book (adds roommates from your friends, tracks approval, and flips the listing to "taken" on confirm).
- `/post` - subletter posting form (title, address, price, dates, furnished, pros, bed/bath/sqft, amenities, utilities included) + incoming booking requests inbox with Approve/Decline + your listings + confirm/relist. `?as=subletter` previews the flow as a subletter account for the demo.
- `/discovery` - match cards. Tap "Message now" for the connection-hero beat.
- `/map` - Google-Maps-style Streets base with a subtle water tint. Category-icon pins for places, stickers, events, listings, and map comments. Legend. Drop-a-comment + drop-a-sticker placement modes. Tap any marker for a rich info sheet: listings show a hero photo + price + bed/bath/furnished/utilities + host with review count + Set-as-commute-anchor + Message host; stickers show category + author's note + who left it; events show taste-fit + intern-attendance from the feed. Setting a listing as the commute anchor (or arriving via `?apartmentId=`) draws a real road-following polyline (Mapbox Directions), lets you pick coffee/gym stops along the route, and generates a schedule.
- `/dms` - conversation list with an Instagram-Notes strip on top showing friends going to events. Message any profile from a Message button.
- `/friends` - accepted friends + incoming/outgoing requests.
- `/profile/[id]` - intern profile (banded badge, taste, pre-flight checklist for self grouped by category with per-group progress, Message + Add-friend for others). Subletter profile shows listings + review summary + reviews panel.
- `/landing` - top-of-page finance readout (take-home vs salary, COL-adjusted rent ceiling, upfront cash needed + relocation stipend/signing bonus offset) followed by your first-week itinerary.
- `/negotiate` - the streaming housing-negotiation hero.

## Data source

`lib/data/source.ts` reads `NEXT_PUBLIC_DATA_SOURCE=fixture|live` (default `fixture`). When `live` is set but a route errors or a key is missing, it falls back to the fixture rather than crashing. That means the whole app runs cold with zero live keys, and you flip surfaces to `live` one at a time as Supabase + the API routes come online.

## Round 4 hosted deployment status

No Round 4 Vercel preview has been created or smoke-tested as of 2026-07-18. The local Vercel CLI is authenticated, but the active `seo23` scope has no Vercel project and this checkout is not linked. Create or link the Perch project before deploying the branch preview.

Hosted smoke testing is also intentionally pending Person B's handoff: a migrated and seeded Supabase project, the public project URL and anon key, Preview server environment values set by Person B, hosted Storage buckets and policies, and live RLS and kill-switch evidence. The service-role key must not be provided to or handled by the browser/deploy owner.

Once those dependencies are available, deploy the `round4-person-a` branch as a Vercel Preview with only the public values (`NEXT_PUBLIC_DATA_SOURCE=live`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `NEXT_PUBLIC_MAPBOX_TOKEN`). Person B sets server-only values directly in Vercel. Exercise the resulting preview URL before reporting success: seeded-user login, protected navigation, sign-out, feed, map tiles, booking, two-user Realtime DM reconciliation, listing-photo and avatar Storage round trips, guarded-route caller identity, RLS isolation evidence from Person B, and the deterministic fallback paths with optional integrations unavailable.

## Start here

1. Read [CLAUDE.md](CLAUDE.md) for the full architecture reference.
2. Read [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md) for the data model, design tokens, and API shapes.
3. Read [docs/PROGRESS.md](docs/PROGRESS.md) for build status.

Mascot assets live in [assets/mascot/](assets/mascot/). Env template lives in [docs/SECRETS.md](docs/SECRETS.md).
