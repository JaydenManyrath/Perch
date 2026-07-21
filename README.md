<p align="center">
  <img src="public/mascot/plush-chick-static-fur.svg" alt="Perch mascot - a plush baby chick" width="220"/>
</p>

# Perch

The social network interns use to land in a new city: find your flock (roommates,
friends, people to go out with) and short-term sublets, and get oriented before you
arrive. Instagram-shaped UX, baby-chick mascot, baby-blue-and-white theme.

Docs style: plain ASCII only (no emojis, no em-dashes).

## What it does

- Onboarding that builds YOUR account: upload your offer letter and the parsed fields
  (name, employer, salary, dates, city) become your identity - flagged low-confidence
  fields are editable, a live finance breakdown recomputes as you correct them, and
  the account is created for the person the letter names with zero pre-seeded friends.
- Flyway (feed): upcoming events near your city - live Ticketmaster events with images
  and links, ranked to your Spotify taste, with going polls, intern counts, and
  comment threads.
- Perches: a Tinder-style deck of fresh sublets with full detail sheets, reviews,
  affordability against your take-home, request-to-book with roommate grouping, and
  freshness rules so stale or taken listings never surface.
- Migration (map): category pins for places, stickers, events, listings, and community
  comments; road-following commute routes from your apartment to your office with
  coffee/gym picks along the way and a generated schedule.
- Chirps (DMs): realtime messaging with optimistic sends, plus a notes strip showing
  which friends are going to which events.
- Nest (profile): banded (verified) badge, taste profile, categorized pre-flight
  checklist, friends and requests.
- The negotiation hero: streaming per-listing verdicts where deterministic rules
  decide (budget, lease window, safety, commute) and the model only narrates.

## Stack

Next.js + TypeScript, Tailwind + shadcn/ui, Framer Motion, Supabase
(Postgres / Auth / Realtime / Storage with RLS everywhere), OpenAI via the Vercel AI
SDK, Ticketmaster Discovery API, Mapbox, Composio (Spotify OAuth), deployed on Vercel.

Full end-to-end reference: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Run it locally

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill the client keys (Supabase URL +
   anon key, Mapbox token). Server keys (service role, OpenAI, Ticketmaster, Composio)
   are server-only - see [docs/SECRETS.md](docs/SECRETS.md); never commit secrets.
3. `npm run dev`. With no keys the app runs fully on the fixture data source; set
   `NEXT_PUBLIC_DATA_SOURCE=live` to hit the real API routes and Supabase.
4. Supabase (for live mode): `npm run db:push` applies `supabase/migrations`, then
   `npm run seed` populates a believable demo cohort (idempotent, safe to re-run).

## Walkthrough

- `/` splash - Start onboarding.
- `/onboarding` - upload offer -> parsed fields render incl. your name from the letter
  (low-confidence fields are flagged with a "check this" hint and editable) + live
  finance breakdown recomputes as you correct them -> your account is created for the
  person the letter names (<name>@perch.demo, shown on the Done step) and starts with
  zero friends until you add them -> Spotify connect (or skip) -> Takeout upload
  (optional) -> add a profile photo (optional; skip in one tap and your initials show
  instead) -> find your flock (recommended interns to add as friends, skippable) ->
  done. Progress is step dots, not a percent.
- `/feed` (labeled "Flyway" in nav) - upcoming events near your city, ranked to your
  taste. Each card shows a picture, venue, category, taste-match bar, a Going Y/N poll
  + intern count, a comment thread, and a link to the real event page.
- `/stories` (labeled "Perches" in nav) - swipe deck of fresh sublets. Right-swipes
  populate the Saved tab. Tap a card for the full detail sheet: furnished, pros,
  bed/bath/sqft, amenities, utilities, host + reviews, affordability vs your
  take-home, and Request-to-book (roommates from your friends, approval tracking,
  listing flips to "taken" on confirm).
- `/post` - subletter posting form + incoming booking requests inbox with
  Approve/Decline + your listings + confirm/relist. `?as=subletter` previews the
  subletter view.
- `/discovery` - match cards. Tap "Message now" to land in a live DM.
- `/map` (labeled "Migration" in nav) - category-icon pins with a legend,
  drop-a-sticker and drop-a-comment modes, rich per-marker info sheets, commute
  routing with along-route coffee/gym picks and a generated schedule.
- `/dms` (labeled "Chirps" in nav) - conversation list with the friends-going-to-events
  notes strip. Message any profile from its Message button.
- `/friends` - accepted friends + incoming/outgoing requests.
- `/profile/[id]` (labeled "Nest" in nav) - intern profile (banded badge, taste,
  categorized pre-flight checklist for self). Subletter profiles show listings +
  review summary.
- `/landing` - finance readout (take-home vs salary, COL-adjusted rent ceiling,
  upfront cash + stipend/bonus offsets) followed by your first-week itinerary.
- `/negotiate` - the streaming housing-negotiation hero over your saved perches.

## Data source

`lib/data/source.ts` reads `NEXT_PUBLIC_DATA_SOURCE=fixture|live` (default `fixture`).
When `live` is set but a route errors or a key is missing, every getter falls back to
the fixture rather than crashing - the whole app runs cold with zero live keys.

## Deploying

The app deploys on Vercel with daily crons for event ingestion and listing expiry,
plus GitHub Actions backstops for seeding and ingest. The full go-live checklist
(environment variables, cron secret, GitHub secrets, Supabase auth URLs, and the
post-deploy smoke list) lives in
[docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md); the hosted-backend
runbook is [docs/RUNBOOK-LIVE-BACKEND.md](docs/RUNBOOK-LIVE-BACKEND.md).

## Docs

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - end-to-end system reference
- [docs/PROGRESS.md](docs/PROGRESS.md) - build history and status
- [docs/SECRETS.md](docs/SECRETS.md) - environment and key handling
- [docs/PRODUCTION-READINESS.md](docs/PRODUCTION-READINESS.md) - go-live checklist
- [docs/RUNBOOK-LIVE-BACKEND.md](docs/RUNBOOK-LIVE-BACKEND.md) - provision/migrate/seed/verify
