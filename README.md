# Perch

The social network interns use to land in a new city: find your flock (roommates, friends, people to go out with) and short-term sublets, and get oriented before you arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

Demo build in dev/test mode (no production auth/verification). Full context in [CLAUDE.md](CLAUDE.md).

Docs style: plain ASCII only (no emojis, no em-dashes). Every merge to `main` updates this README and [docs/PROGRESS.md](docs/PROGRESS.md).

## Status

- Round 1 (v1 app): DONE, merged to `main`. Full Instagram-shaped app on seed/fixture data with both heroes wired (streaming negotiation and the live intern-connection beat). See [docs/PROGRESS.md](docs/PROGRESS.md).
- Round 2: PLANNED. Auto-sourced sublets + freshness, swipe perches, subletter posting, Airbnb-style reviews, Ticketmaster events + intern attendance, offer-parser hardening, map icons, tappable profiles. Seams in [FOUNDATION-CONTRACT.md §11](docs/FOUNDATION-CONTRACT.md).

## The stack (locked)

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase (DB / Auth / Realtime / Storage), OpenAI via Vercel AI SDK, Composio (Spotify + IG Business OAuth), Mapbox, deployed on Vercel.

## How the work is split (2 people)

| Branch | Owner | Round-1 plan | Round-2 plan |
|---|---|---|---|
| [person-a](../../tree/person-a) | Person A - Experience & Social Shell (design system, mascot, shell, feed, perches, profile, discovery, live DMs, map/stickers) | `docs/IMPLEMENTATION-PERSON-A.md` | `docs/IMPLEMENTATION-PERSON-A-ROUND2.md` |
| [person-b](../../tree/person-b) | Person B - Intelligence, Data & Hero (schema + RLS + auth, seed, integrations + parsers, matching engine, streaming negotiation hero) | `docs/IMPLEMENTATION-PERSON-B.md` | `docs/IMPLEMENTATION-PERSON-B-ROUND2.md` |

Both build against the shared interface in [docs/FOUNDATION-CONTRACT.md](docs/FOUNDATION-CONTRACT.md). Round-2 seams are §11 of that file; the sourcing design is [docs/SOURCING-PROPOSAL.md](docs/SOURCING-PROPOSAL.md).

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
