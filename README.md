# Perch

The social network interns use to land in a new city: find your flock (roommates, friends, people to go out with) and short-term sublets, and get oriented before you arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

Demo build in dev/test mode (no production auth/verification). Full context in [CLAUDE.md](CLAUDE.md).

Docs style: plain ASCII only (no emojis, no em-dashes). Every merge to `main` updates this README and [docs/PROGRESS.md](docs/PROGRESS.md).

## Status

- Round 1 (v1 app): DONE, merged to `main`. Full Instagram-shaped app on seed/fixture data with both heroes wired (streaming negotiation and the live intern-connection beat). See [docs/PROGRESS.md](docs/PROGRESS.md).
- Round 2 Person A (all UI): DONE on `person-a`, both batches (RA1-RA19). Perches swipe deck + saved tray, subletter posting + freshness confirm, Airbnb-style reviews on perches and on subletter profiles, tappable profiles, Google-Maps-style icons + legend + event pins, event card with picture + venue + Going Y/N poll + comments, offer manual-correction, feed events-only, map comments with placeholders + read/add, friends UI (add + list + requests), DMs Instagram-Notes strip, front-page cleanup, and apartment -> office colored route + along-route POI selection + generated schedule. Full walkthrough in [docs/IMPLEMENTATION-PERSON-A-ROUND2.md](docs/IMPLEMENTATION-PERSON-A-ROUND2.md).
- Round 2 Person B (schema + core CRUD APIs): PLANNED (RB1-RB14). See [docs/IMPLEMENTATION-PERSON-B-ROUND2.md] and PROGRESS.md.
- Round 2 Person C (integrations + AI): PLANNED (RC1-RC8). See [docs/IMPLEMENTATION-PERSON-C-ROUND2.md] and PROGRESS.md.

Seams for round 2: [FOUNDATION-CONTRACT.md sections 11 and 12](docs/FOUNDATION-CONTRACT.md). Person A ships against fixtures that mirror the frozen shapes exactly; flipping to live is a data-source env switch once B and C land their routes.

## The stack (locked)

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase (DB / Auth / Realtime / Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, deployed on Vercel.

## How the work is split

Round 1 (v1 app) was split two ways; round 2 is split THREE ways.

| Branch | Round-1 role | Round-2 role | Round-1 plan | Round-2 plan |
|---|---|---|---|---|
| [person-a](../../tree/person-a) | Experience & Social Shell | All consumer UI | `docs/IMPLEMENTATION-PERSON-A.md` | `docs/IMPLEMENTATION-PERSON-A-ROUND2.md` |
| [person-b](../../tree/person-b) | Intelligence, Data & Hero | Schema + core CRUD APIs | `docs/IMPLEMENTATION-PERSON-B.md` | `docs/IMPLEMENTATION-PERSON-B-ROUND2.md` |
| [person-c](../../tree/person-c) | (new in round 2) | Integrations + AI (sourcing pipeline + freshness jobs, Ticketmaster, OCR parser) | - | `docs/IMPLEMENTATION-PERSON-C-ROUND2.md` |

All three build against the shared interface in [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md). The round-2 ownership maps and seams are section 11 (batch 1) and section 12 (batch 2) of that file; the sourcing design is [docs/SOURCING-PROPOSAL.md](docs/SOURCING-PROPOSAL.md). Both batches live in the same per-person round-2 plans (`docs/IMPLEMENTATION-PERSON-{A,B,C}-ROUND2.md`).

## Run it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill the client keys (Supabase anon URL/key, Mapbox token). Server keys (service role, OpenAI, Composio, Ticketmaster) go in `.env` per [docs/SECRETS.md](docs/SECRETS.md); never commit secrets.
3. `npm run dev`. The app runs on the fixture data source with no live keys; set `NEXT_PUBLIC_DATA_SOURCE=live` to hit real routes/Supabase.
4. Supabase: apply `supabase/migrations` and run the seed to populate a live DB.

## Round 2 walkthrough (all fixture-driven; live routes gated behind env)

- `/stories` - Tinder-style swipe deck of fresh sublets, right-swipe saves to the Saved tab, tap opens a detail sheet with the host + reviews + a Plan-the-commute button.
- `/post` (or `/post?as=subletter` for the demo) - post a sublease + see your listings with a confirm/relist affordance.
- Any avatar or name across feed, discovery, DMs, reviews, or a perch host is tappable and opens `/profile/[id]`. A subletter profile shows listings + a review summary + a reviews panel.
- `/feed` is events-only. Each card shows a picture, venue, category, taste-match, a Going Y/N poll + count, and a comment thread.
- `/map` is one map for everything: Google-Maps-style category icons for places, stickers, events, listings, comments; a legend; drop-a-comment + drop-a-sticker placement modes; and when an apartment is selected (from the perch detail sheet or by tapping a listing pin) it draws the office-to-apartment commute as a colored polyline, lets you pick along-route POIs (coffee / gym), and generates a schedule.
- `/friends` - accepted friends + incoming/outgoing requests. Add-friend button lands on match cards and other-user profiles.
- `/dms` - the conversation list with an Instagram-Notes strip on top showing friends who are going to events.
- Onboarding OfferStep flags low-confidence fields (needsReview) and lets you correct any field before continuing.

## Start here

1. Read [CLAUDE.md](CLAUDE.md) for the full architecture reference.
2. Read [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md) for the data model, design tokens, API shapes, and the round-2 seams (sections 11 and 12).
3. Check out your branch and follow your round-1 and round-2 implementation plans in `docs/`.
4. Track and update status in [docs/PROGRESS.md](docs/PROGRESS.md).

Mascot assets live in [assets/mascot/](assets/mascot/).
