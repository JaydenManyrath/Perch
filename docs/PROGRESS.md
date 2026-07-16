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

Seams: FOUNDATION-CONTRACT.md §11. Sourcing: SOURCING-PROPOSAL.md. Plans: IMPLEMENTATION-PERSON-A-ROUND2.md, IMPLEMENTATION-PERSON-B-ROUND2.md.

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

### Person B (round 2) - branch person-b
- [todo] RB1 Migration: user_type; listings status/expiry/sourced/source_name/source_url/external_id
- [todo] RB2 Migration + RLS: listing_swipes, reviews, event_attendance
- [todo] RB3 Sourcing pipeline: adapter interface + seed adapter + ingest + dedupe (SOURCING-PROPOSAL.md)
- [todo] RB4 Freshness: expiry job + "still available?" ping dispatch + confirm route
- [todo] RB5 Perches API: GET /api/perches, POST /api/perches/swipe, GET /api/perches/saved
- [todo] RB6 Subletter posting: POST /api/listings, POST /api/listings/{id}/confirm + validation
- [todo] RB7 Reviews API: GET/POST /api/reviews + summary aggregation
- [todo] RB8 Ticketmaster integration: /api/events/nearby + upsert + seeded fallback
- [todo] RB9 Attendance: POST /api/events/{id}/attend + counts; feed additions
- [todo] RB10 Offer parser hardening: OCR + broader formats + confidence/needsReview
- [todo] RB11 GET /api/users/{id} public profile
- [todo] RB12 Expose kind/category per mappable row for A's icons; seed round-2 data

## Log

- 2026-07-16: Round 1 merged to main.
- 2026-07-16: Round 2 planned; contract §11, sourcing proposal, and per-person round-2 plans added.
