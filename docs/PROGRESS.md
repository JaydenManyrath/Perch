# Perch - Progress Tracker

Single source of truth for build status. Every merge to `main` updates this file (mark items done, dated) and `README.md`. Plain ASCII only (no emojis, no em-dashes).

Status keys: `[done]` merged to main | `[wip]` in progress on a branch | `[todo]` planned | `[blocked]` waiting on a dependency.

## Round 1 - v1 app (shipped, merged to main)

Merged 2026-07-16. The full Instagram-shaped app is live on seed/fixture data with both heroes wired (streaming housing negotiation + the live intern-connection beat).

### Experience & Social Shell
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

### Intelligence, Data & Hero
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

## Round 2 (shipped, merged to main)

All UI + schema + APIs + integrations landed on `main`. Split three ways during the build: UI, schema + core CRUD APIs, integrations + AI.

### UI (all consumer surfaces)
- [done] RA1 Perches swipe deck (Tinder-style: drag left/right + Pass/Save buttons + detail sheet)
- [done] RA2 Saved tray populated by right-swipes
- [done] RA3 Subletter "post a sublease" form (subletter accounts)
- [done] RA4 Listing freshness badges + subletter confirm/relist UI
- [done] RA5 Reviews UI: star composer + review lists + rating badges (on perch detail + subletter profile)
- [done] RA6 Tappable profiles everywhere; subletter profile view
- [done] RA7 Map: Google-Maps-style category icons + event pins + legend
- [done] RA8 Event card: venue/image + "N interns going" + Going toggle
- [done] RA9 Onboarding OfferStep: manual-correction UI for low-confidence fields
- [done] RA10 Plain-ASCII sweep of user-facing strings (no emojis/em-dashes)
- [done] RA11 Feed events-only
- [done] RA12 Map comment placeholders + read/add sheet on the map
- [done] RA13 Event comments UI (composer + list) on the event card
- [done] RA14 Event going Y/N poll + "N interns going" count on the event card
- [done] RA15 Feed pictures
- [done] RA16 Friends UI: add-friend button + friends list + requests inbox
- [done] RA17 DMs Instagram-Notes strip
- [done] RA18 Front-page cleanup
- [done] RA19 Apartment route on map (colored, road-following via Mapbox Directions) + POI-along-route selection + schedule view
- [done] Follow-ups: Message-on-profile, rename Perches, deterministic conversation IDs, /dms client-side refresh, per-card swipe motion (no after-image)

### Schema + core CRUD APIs
- [done] RB1 Migrations for user_type; listings status/expiry/sourced/source_name/source_url/external_id
- [done] RB2 Migrations + RLS for listing_swipes, reviews, event_attendance (+ RLS test suite)
- [done] RB3 Perches API: GET /api/perches, POST /api/perches/swipe, GET /api/perches/saved
- [done] RB4 Subletter posting: POST /api/listings, POST /api/listings/{id}/confirm + validation + owner RLS
- [done] RB5 Reviews API: GET/POST /api/reviews + summary aggregation
- [done] RB6 Attendance API: POST /api/events/{id}/attend + counts; feed additions
- [done] RB7 Public profile: GET /api/users/{id}
- [done] RB8 Round-2 base seed (subletters, listings across statuses, swipes, reviews, attendance)
- [done] RB9 notes.lat/lng + GET/POST /api/map/comments
- [done] RB10 comments table + RLS + GET/POST /api/events/{id}/comments
- [done] RB11 event_attendance as going Y/N; POST /api/events/{id}/attend { going } -> { going, viewerGoing }
- [done] RB12 friendships table + RLS + friends API (list, requests, request/accept/decline)
- [done] RB13 GET /api/friends/notes (accepted friends joined with event_attendance)
- [done] RB14 /api/route/pois + /api/route/schedule

### Integrations + AI
- [done] RC1 Sourcing pipeline: SourceAdapter interface + seed adapter + normalize + dedupe + ingest + admin trigger route
- [done] RC2 Freshness jobs: expiry pass + "still available?" ping dispatch
- [done] RC3 Ticketmaster integration: Discovery API client + GET /api/events/nearby + upsert + seeded fallback
- [done] RC4 Offer parser hardening: broader formats + OCR + per-field confidence/needsReview
- [done] RC5 Seed sourced listings via the adapter
- [done] RC6 POST /api/route: Mapbox Directions polyline + distance/duration + seeded fallback
- [done] RC7 Office geocode from employer
- [done] RC8 POI search along the route corridor (Mapbox) for coffee/gym candidates

## Round 3 (planned 2026-07-16)

Same three-way split. Seams: FOUNDATION-CONTRACT.md section 13. Plans: IMPLEMENTATION-PERSON-A-ROUND3.md, IMPLEMENTATION-PERSON-B-ROUND3.md, IMPLEMENTATION-PERSON-C-ROUND3.md. Round-3 migrations start at 0011.

### UI (person-a) - shipped on branch person-a 2026-07-16
- [done] RA31 Ticketmaster event image renders on the feed card (+ placeholder fallback)
- [done] RA32 Comprehensive sublet detail sheet: furnished line, Pros list, bed/bath/sqft, amenities, utilities; add the fields to the post form
- [done] RA33 Roommate grouping UI: add-a-roommate (from friends) on a saved perch/booking + grouped view
- [done] RA34 Booking flow UI: Request-to-book, owner approval inbox, booked state; a booked perch leaves the deck
- [done] RA35 Finance UI: take-home vs salary, cost-of-living, upfront cash, relocation stipend (onboarding summary + landing readout + perch affordability)
- [done] RA36 Checklist UI: fuller checklist grouped by category (travel, logistics, packing, admin) with per-group progress
- [done] RA37 Onboarding percentages removed (confidence percent -> "check this" flag; step dots replace the percent bar)
- [done] RA38 Map marker press -> richer info sheet (listing / sticker / event enriched with attendance + taste)

### Schema + core APIs (person-b)
- [todo] RB31 listings columns (0011): furnished, pros, bedrooms, bathrooms, sqft, amenities, utilities_included + GET /api/listings/{id} (ListingDetail) + post validation
- [todo] RB32 bookings table + RLS + state machine (requested -> approved -> booked; booked sets listings.status=taken) + booking API (book/approve/decline/confirm/list)
- [todo] RB33 Roommate grouping: bookings.roommate_ids + invite/accept API
- [todo] RB34 Finance model (deterministic): take-home tax brackets, COL-adjusted budget, upfront cash, stipend/bonus; GET /api/finance; negotiation budget scout uses it
- [todo] RB35 Checklist seed: flights, shipping, what-to-bring, parking/car + optional category column
- [todo] RB36 Feed/events guard datetime >= now (upcoming only); marker payloads carry enough detail for the map info sheet

### Integrations + AI (person-c)
- [todo] RC31 Ticketmaster: upcoming-only filter (startDateTime >= now, sorted ascending) + capture best image_url
- [todo] RC32 Offer parser: extract relocationStipend + signingBonus (upfront cash) with per-field confidence
- [todo] RC33 Cost-of-living data source (city index + median rent; seeded table + optional external lookup) feeding B's finance model
- [todo] RC34 (optional) Map place-details lookup (Mapbox) for richer marker info

## Log

- 2026-07-16: Round 1 merged to main.
- 2026-07-16: Round 2 planned and split three ways.
- 2026-07-16: Round 2 batch 2 planned.
- 2026-07-16: Round 2 fully shipped and merged to main. Implementation docs removed; keeping FOUNDATION-CONTRACT.md, PROGRESS.md, SECRETS.md, README.md, CLAUDE.md.
- 2026-07-16: Round 3 planned (upcoming events + images, comprehensive sublet details + pros + furnished, roommate grouping, booking flow, real finance model, fuller checklist, onboarding-percentage removal, richer map info); split three ways on branches person-a/person-b/person-c.
- 2026-07-16: Round 3 UI (person-a, RA31-RA38) shipped on branch person-a. Fixture-first: booking state machine, roommate grouping, finance breakdown, and richer marker sheets all drivable end-to-end without waiting on B/C. Extended lib/types/contract.ts with the frozen R3 shapes (ListingDetail, Booking, FinanceBreakdown, ChecklistCategory) and lib/data/source.ts with the matching getters so the live-swap stays invisible.
