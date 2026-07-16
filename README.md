# Perch

The social network interns use to land in a new city: find your flock (roommates, friends, people to go out with) and short-term sublets, and get oriented before you arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

Demo build in dev/test mode (no production auth/verification). Full context in [CLAUDE.md](CLAUDE.md).

Docs style: plain ASCII only (no emojis, no em-dashes). Every merge to `main` updates this README and [docs/PROGRESS.md](docs/PROGRESS.md).

## Status

- Round 1 (v1 app): DONE, merged to `main`. Full Instagram-shaped app on seed/fixture data with both heroes wired (streaming negotiation and the live intern-connection beat). See [docs/PROGRESS.md](docs/PROGRESS.md).
- Round 2: PLANNED (two batches). Batch 1 (§11): auto-sourced sublets + freshness, swipe perches, subletter posting, Airbnb-style reviews, Ticketmaster events + intern attendance, offer-parser hardening, map icons, tappable profiles. Batch 2 (§12): comments move from the feed to the map, event comments + going yes/no poll + feed pictures, friends, an Instagram-Notes strip in DMs, front-page cleanup, and an apartment-to-office route with along-route POI selection and a generated schedule. Seams in [FOUNDATION-CONTRACT.md §11-§12](docs/FOUNDATION-CONTRACT.md).

## The stack (locked)

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase (DB / Auth / Realtime / Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, deployed on Vercel.

## How the work is split

Round 1 (v1 app) was split two ways; round 2 is split THREE ways.

| Branch | Round-1 role | Round-2 role | Round-1 plan | Round-2 plan |
|---|---|---|---|---|
| [person-a](../../tree/person-a) | Experience & Social Shell | All consumer UI | `docs/IMPLEMENTATION-PERSON-A.md` | `docs/IMPLEMENTATION-PERSON-A-ROUND2.md` |
| [person-b](../../tree/person-b) | Intelligence, Data & Hero | Schema + core CRUD APIs | `docs/IMPLEMENTATION-PERSON-B.md` | `docs/IMPLEMENTATION-PERSON-B-ROUND2.md` |
| [person-c](../../tree/person-c) | (new in round 2) | Integrations + AI (sourcing pipeline + freshness jobs, Ticketmaster, OCR parser) | - | `docs/IMPLEMENTATION-PERSON-C-ROUND2.md` |

All three build against the shared interface in [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md). The round-2 ownership maps and seams are §11 (batch 1) and §12 (batch 2) of that file; the sourcing design is [docs/SOURCING-PROPOSAL.md](docs/SOURCING-PROPOSAL.md). Both batches live in the same per-person round-2 plans (`docs/IMPLEMENTATION-PERSON-{A,B,C}-ROUND2.md`).

## Run it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill the client keys (Supabase anon URL/key, Mapbox token). Server keys (service role, OpenAI, Composio, Ticketmaster) go in `.env` per [docs/SECRETS.md](docs/SECRETS.md); never commit secrets.
3. `npm run dev`. The app runs on the fixture data source with no live keys; set `NEXT_PUBLIC_DATA_SOURCE=live` to hit real routes/Supabase.
4. Supabase: apply `supabase/migrations` and run the seed to populate a live DB.

## Start here

1. Read [CLAUDE.md](CLAUDE.md) for the full architecture reference.
2. Read [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md) for the data model, design tokens, API shapes, and the round-2 seams (§11).
3. Check out your branch and follow your round-1 and round-2 implementation plans in `docs/`.
4. Track and update status in [docs/PROGRESS.md](docs/PROGRESS.md).

Mascot assets live in [assets/mascot/](assets/mascot/).
