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

- Round 3: PLANNED. Upcoming-events-only + event images, comprehensive sublet details (pros + furnished + bed/bath/sqft/amenities), roommate grouping, a real booking flow (owner approves then booked, removed from listings), a realistic financial model (cost-of-living, upfront cash, relocation stipend, take-home != salary), a fuller pre-flight checklist (flights, shipping, what-to-bring, parking/car), removal of onboarding percentages, and richer map-marker info on press. Split three ways on branches `person-a` / `person-b` / `person-c`; plans in `docs/IMPLEMENTATION-PERSON-{A,B,C}-ROUND3.md`.

Seams are documented in [FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md): sections 11 (round-2 batch 1), 12 (round-2 batch 2), and 13 (round 3). The `lib/types/contract.ts` file mirrors those shapes verbatim.

## The stack (locked)

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase (DB / Auth / Realtime / Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, deployed on Vercel.

## Run it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill the client keys (Supabase anon URL/key, Mapbox token). Server keys (service role, OpenAI, Composio, Ticketmaster) go in `.env` per [docs/SECRETS.md](docs/SECRETS.md); never commit secrets.
3. `npm run dev`. The app runs on the fixture data source with no live keys; set `NEXT_PUBLIC_DATA_SOURCE=live` to hit the real API routes and Supabase.
4. Supabase (optional for live mode): `supabase db reset` to apply `supabase/migrations`, then `npm run seed` to populate a live DB. `npm run seed:sourcing` seeds via the auto-sourcing pipeline.

## Walkthrough

- `/` splash - Start onboarding.
- `/onboarding` - upload offer -> parsed fields render (low-confidence fields are flagged and editable) -> Spotify connect (or skip) -> Takeout upload (optional) -> done.
- `/feed` - events only, ranked to your taste. Each card shows a picture, venue, category, taste-match bar, a Going Y/N poll + intern count, and a comment thread.
- `/stories` (labeled "Perches" in nav) - Tinder-style swipe deck of fresh sublets. Drag or use Pass/Save buttons. Right-swipes populate the Saved tab. Tap a card for details, host, reviews, and "Plan the commute".
- `/post` - subletter posting form + your listings + confirm/relist affordance. `?as=subletter` previews the flow as a subletter account for the demo.
- `/discovery` - match cards. Tap "Message now" for the connection-hero beat.
- `/map` - Google-Maps-style Streets base with a subtle water tint. Category-icon pins for places, stickers, events, listings, and map comments. Legend. Drop-a-comment + drop-a-sticker placement modes. Select a listing pin (or arrive via `?apartmentId=`) to draw a real road-following commute polyline (Mapbox Directions), pick coffee/gym stops along the route, and generate a schedule.
- `/dms` - conversation list with an Instagram-Notes strip on top showing friends going to events. Message any profile from a Message button.
- `/friends` - accepted friends + incoming/outgoing requests.
- `/profile/[id]` - intern profile (banded badge, taste, pre-flight checklist for self, Message + Add-friend for others). Subletter profile shows listings + review summary + reviews panel.
- `/landing` - first-week itinerary.
- `/negotiate` - the streaming housing-negotiation hero.

## Data source

`lib/data/source.ts` reads `NEXT_PUBLIC_DATA_SOURCE=fixture|live` (default `fixture`). When `live` is set but a route errors or a key is missing, it falls back to the fixture rather than crashing. That means the whole app runs cold with zero live keys, and you flip surfaces to `live` one at a time as Supabase + the API routes come online.

## Start here

1. Read [CLAUDE.md](CLAUDE.md) for the full architecture reference.
2. Read [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md) for the data model, design tokens, and API shapes.
3. Read [docs/PROGRESS.md](docs/PROGRESS.md) for build status.

Mascot assets live in [assets/mascot/](assets/mascot/). Env template lives in [docs/SECRETS.md](docs/SECRETS.md).
