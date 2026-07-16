# Perch - Progress Tracker

Single source of truth for build status. RULE: every merge to `main` updates this file (mark items done, dated) and `README.md`. Plain ASCII only (no emojis, no em-dashes).

Status keys: `[done]` merged to main | `[wip]` in progress on a branch | `[todo]` planned | `[blocked]` waiting on a dependency.

## Round 1 - v1 app (shipped, merged to main)

Merged 2026-07-16 via "Merge person-b into main". The full Instagram-shaped app is live on seed/fixture data with both heroes wired.

### Person A - Experience & Social Shell
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

### Person B - Intelligence, Data & Hero
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

## Round 2 - Feature additions (planned 2026-07-16)

Split THREE ways: Person A (all UI), Person B (schema + core CRUD APIs), Person C (integrations + AI). Seams + ownership map: FOUNDATION-CONTRACT.md §11. Sourcing: SOURCING-PROPOSAL.md. Plans: IMPLEMENTATION-PERSON-A-ROUND2.md, IMPLEMENTATION-PERSON-B-ROUND2.md, IMPLEMENTATION-PERSON-C-ROUND2.md.

### Person A (round 2) - branch person-a
- [todo] RA1 Perches swipe deck (Tinder-style: drag left/right + buttons + detail sheet)
- [todo] RA2 Saved tray populated by right-swipes
- [todo] RA3 Subletter "post a sublease" form (subletter accounts)
- [todo] RA4 Listing freshness badges + subletter confirm/relist UI
- [todo] RA5 Reviews UI: star composer + review lists + rating badges
- [todo] RA6 Tappable profiles everywhere; subletter profile view
- [todo] RA7 Map: Google-Maps-style category icons + event pins + legend
- [todo] RA8 Event card: venue/image + "N interns going" + Going toggle
- [todo] RA9 Onboarding OfferStep: manual-correction UI for low-confidence fields
- [todo] RA10 Plain-ASCII sweep of existing user-facing strings (no emojis/em-dashes)

### Person B (round 2) - branch person-b - schema + core CRUD APIs
- [todo] RB1 Migration: user_type; listings status/expiry/sourced/source_name/source_url/external_id (schema only; C runs the pipeline that fills them)
- [todo] RB2 Migration + RLS: listing_swipes, reviews, event_attendance (+ extend RLS test suite)
- [todo] RB3 Perches API: GET /api/perches (fresh-only, excludes swiped, enriched), POST /api/perches/swipe, GET /api/perches/saved
- [todo] RB4 Subletter posting: POST /api/listings (subletter-only), POST /api/listings/{id}/confirm + validation + owner RLS
- [todo] RB5 Reviews API: GET/POST /api/reviews + summary aggregation (intern-only writes)
- [todo] RB6 Attendance API: POST /api/events/{id}/attend + counts; feed additions (internsGoing, viewerGoing, event venue/url/imageUrl/priceRange)
- [todo] RB7 Public profile: GET /api/users/{id}
- [todo] RB8 Expose kind/category per mappable row for A's icons; round-2 base seed (subletters, listings across statuses, swipes, reviews, attendance)

### Person C (round 2) - branch person-c - integrations + AI
- [todo] RC1 Sourcing pipeline: SourceAdapter interface + seed adapter + normalize + dedupe + ingest + admin trigger route (SOURCING-PROPOSAL.md), on B's schema
- [todo] RC2 Freshness jobs: expiry pass (available -> stale) + "still available?" ping dispatch (B owns the confirm route)
- [todo] RC3 Ticketmaster integration: Discovery API client (keyed, read-only, rate-limited) + GET /api/events/nearby + events upsert (dedupe external_id) + seeded fallback
- [todo] RC4 Offer parser hardening: broader formats + OCR for scanned PDFs + per-field confidence/needsReview in the parser and /api/parse/offer response
- [todo] RC5 Seed sourced listings via the adapter (demo dataset incl. one near-expiry) + Ticketmaster-shaped events; coordinate with B's base seed

## Round 2 - Additional features / batch 2 (planned 2026-07-16)

Still Round 2, same three-way split. Seams: FOUNDATION-CONTRACT.md §12. Added to the existing round-2 plans (IMPLEMENTATION-PERSON-{A,B,C}-ROUND2.md), continuing each person's numbering.

### Person A (round 2, batch 2) - branch person-a - all UI
- [todo] RA11 Remove NoteThread interleave from the feed; feed is events-only
- [todo] RA12 Map comment placeholders + read/add sheet on the map (notes move here)
- [todo] RA13 Event comments UI (composer + list) on the event card
- [todo] RA14 Event going Y/N poll + "N interns going" count on the event card
- [todo] RA15 Feed pictures (render event images)
- [todo] RA16 Friends UI: add-friend button + friends list + requests inbox
- [todo] RA17 DMs Instagram-Notes strip (friends going to events)
- [todo] RA18 Remove front-page dev shortcuts (skip-to-shell, negotiation) in app/page.tsx
- [todo] RA19 Apartment route on map (colored) + POI-along-route selection + schedule view

### Person B (round 2, batch 2) - branch person-b - schema + core APIs
- [todo] RB9 notes.lat/lng (map comments) + GET/POST /api/map/comments
- [todo] RB10 comments table + RLS + GET/POST /api/events/{id}/comments
- [todo] RB11 event_attendance as going Y/N; POST /api/events/{id}/attend { going } -> { going, viewerGoing }; feed image passthrough
- [todo] RB12 friendships table + RLS + friends API (list, requests, request/accept/decline)
- [todo] RB13 GET /api/friends/notes (accepted friends joined with event_attendance)
- [todo] RB14 /api/route/pois (deterministic along-route filter) + /api/route/schedule (extends itinerary) + optional commute_plans table

### Person C (round 2, batch 2) - branch person-c - integrations + AI
- [todo] RC6 POST /api/route: Mapbox Directions (office -> apartment) polyline + distance/duration + seeded fallback
- [todo] RC7 Office geocode from employer (Mapbox geocoding, seeded company coords fallback)
- [todo] RC8 POI search along the route corridor (Mapbox) for coffee/gym candidates beyond the user's own places

## Log

- 2026-07-16: Round 1 merged to main.
- 2026-07-16: Round 2 planned; contract §11, sourcing proposal, and per-person round-2 plans added.
- 2026-07-16: Round 2 re-split three ways (A = UI, B = schema + core APIs, C = integrations + AI); person-c branch added.
- 2026-07-16: Round 2 batch 2 planned (comments to map, event comments + going poll, feed pictures, friends, DMs notes strip, front-page cleanup, apartment route + schedule); added to the same three round-2 plans.
