# Perch Round 3 - Implementation Plan: PERSON B (schema + core CRUD APIs)

Mission: own the Round 3 database and synchronous API routes - the comprehensive listing columns + detail route, the booking flow and its state machine, roommate grouping, the deterministic financial model, the checklist seed additions, and the upcoming-events guard. Person A renders it; Person C provides the external data (upcoming events, parsed stipend, cost-of-living).

Branch: person-b. Boundary with C: you own the database (migrations, RLS, seed) and the synchronous CRUD/deterministic routes. C reaches out (Ticketmaster, geocoding, cost-of-living, OCR). When C needs a column, you add it.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 13 (frozen seams + types); docs/IMPLEMENTATION-PERSON-C-ROUND3.md (the data you consume) and PERSON-A-ROUND3.md (who renders your routes); docs/PROGRESS.md (RB31..RB36); the shipped code.

Working agreements (11.12 / 13.11): plain ASCII; update README + PROGRESS every merge; add the 13.9 types to lib/types/contract.ts in the same PR; default-deny RLS, adversarially tested; every route rate-limited; the finance model and booking state machine are DETERMINISTIC code (no model decides money or a booking status).

## 1. Scope - what Person B owns in Round 3

- RB31 Comprehensive listing columns + detail route. Migration 0011: listings gains furnished boolean, pros text[], bedrooms integer, bathrooms numeric(3,1), sqft integer, amenities text[], utilities_included boolean (all nullable; backfill sensible values for seeded/sourced rows). GET /api/listings/{id} returns a ListingDetail (section 13.9) joining the row + reviewSummary + host + status. Extend POST /api/listings (app/api/listings/route.ts) validation to accept the new fields.
- RB32 Booking flow + state machine. Migration 0011: bookings table (id, listing_id fk, booker_id fk, roommate_ids uuid[] default '{}', status check in ('requested','approved','booked','declined','cancelled'), created_at, decided_at) + RLS (booker + roommates + listing owner only). Deterministic state machine: requested -> owner approved -> booker/group confirm -> booked; on booked set listings.status='taken' (so GET /api/perches drops it for everyone); declined/cancelled release. Routes: POST /api/listings/{id}/book, POST /api/bookings/{id}/approve, POST /api/bookings/{id}/decline, POST /api/bookings/{id}/confirm, GET /api/bookings (mine + incoming-as-owner).
- RB33 Roommate grouping. bookings.roommate_ids holds co-occupants (must be accepted friends or invited-and-accepted). Routes: POST /api/bookings/{id}/roommates { userId } (invite), POST /api/bookings/{id}/roommates/accept (invitee). Enforce friend-or-invited in code + RLS.
- RB34 Deterministic finance model. lib/finance/model.ts: takeHome from salary via a documented effective-tax-by-bracket function (NOT a flat 0.75), a COL-adjusted monthly budget (using C's cost-of-living index), upfrontCashNeeded (deposit + first month + moving), folding in relocationStipend + signingBonus (from C's parse). GET /api/finance -> FinanceBreakdown. Update the negotiation budget scout (lib/negotiate/budget.ts) to use this model (take-home + COL), never raw salary. Optional users columns to persist stipend/bonus if needed.
- RB35 Checklist seed. Seed checklist_items with flights, shipping/movers, what-to-bring (packing list), parking/car (keep existing). Add an optional category text column (travel, logistics, packing, admin) in 0011; update lib/fixtures/checklist.ts + the seed script.
- RB36 Upcoming guard + marker payloads. GET /api/feed and GET /api/events/nearby guard datetime >= now (upcoming only) in-query, even though C also filters at the source. Ensure the map marker routes (map/places, map/comments, listings, events) return enough fields for A's info sheet (price/furnished/pros/status for listings, author/text for comments, date/venue/going for events).

### NOT yours
- Person A: all UI (detail sheet, post form, booking UI, roommate UI, finance UI, checklist UI, onboarding percent removal, map info sheet).
- Person C: Ticketmaster upcoming + image capture; offer parser stipend/bonus extraction; the cost-of-living data source; optional place-details lookup. You CONSUME C's cost-of-living index and the parsed stipend/bonus; agree those shapes up front.

## 2. Repo additions

```
supabase/migrations/
  0011_round3_listings_bookings.sql   # RB31/RB32/RB35 columns + bookings table + checklist category
  0012_round3_rls.sql                 # RB32/RB33 bookings + roommate RLS (+ tests)
lib/finance/model.ts                  # RB34 deterministic finance (consumes C's cost-of-living)
app/api/listings/[id]/route.ts        # RB31 GET ListingDetail
app/api/listings/[id]/book/route.ts   # RB32 request
app/api/bookings/route.ts             # RB32 GET mine + incoming
app/api/bookings/[id]/approve/route.ts  app/api/bookings/[id]/decline/route.ts  app/api/bookings/[id]/confirm/route.ts
app/api/bookings/[id]/roommates/route.ts  app/api/bookings/[id]/roommates/accept/route.ts  # RB33
app/api/finance/route.ts              # RB34 GET FinanceBreakdown
```
Rate-limit new routes; add the 13.9 types to lib/types/contract.ts.

## 3. Build phases (test-first; commit after each; update PROGRESS + README each merge)

- Phase R3B-1 Migrations + RLS (0011, 0012): columns, bookings, checklist category; RLS default-deny + booking/roommate policies. Extend tests/rls.test.ts: only booker/roommates/owner can read a booking; only the owner approves/declines; only the booker confirms; a stranger cannot join a booking. Acceptance: db reset clean, RLS tests green. Publish the column set to C.
- Phase R3B-2 Listing detail + post fields (RB31): GET /api/listings/{id} returns ListingDetail; POST /api/listings validates the new fields. Acceptance: detail returns furnished/pros/bed/bath/sqft/amenities/utilities.
- Phase R3B-3 Booking + roommate (RB32/RB33): the state machine + routes; booked sets listings.status='taken'; roommate invite/accept enforces friend-or-invited. Acceptance: request -> approve -> confirm -> booked, and the listing drops from GET /api/perches; RLS blocks cross-party actions.
- Phase R3B-4 Finance model (RB34): lib/finance/model.ts (documented tax brackets) + GET /api/finance; budget scout uses take-home + COL. Acceptance: /api/finance returns a coherent breakdown; the negotiation budget is take-home + COL adjusted, deterministic (same inputs -> same output), and never uses raw salary.
- Phase R3B-5 Checklist + upcoming guard + marker payloads (RB35/RB36): seed new checklist items + category; feed/events guard datetime >= now; marker routes carry detail. Acceptance: checklist has the new items grouped; no past event is ever returned; marker payloads populate A's info sheet.

## 4. Definition of done + demo checklist
Done when: migrations build clean; RLS green (bookings/roommates); GET /api/listings/{id} is comprehensive; the booking state machine works and a booked listing is taken (removed from the deck); roommate grouping enforces friend-or-invited; GET /api/finance + the budget scout are deterministic and realistic (take-home != salary, COL-adjusted, upfront + stipend); the checklist seed has the new items; feed/events are upcoming-only; marker payloads carry detail. Routes rate-limited; README + PROGRESS updated.

Demo: fetch a comprehensive listing; run request -> approve -> confirm and watch the listing go taken and leave the deck; invite a roommate; call /api/finance and show the breakdown; confirm the budget scout uses take-home + COL; show the seeded checklist additions; confirm no past events come back.

## 5. Integration checkpoints
- With C (schema + data handshake, FIRST): agree the cost-of-living index shape and the parsed stipend/bonus fields BEFORE wiring the finance model; you own the migration, C provides the data.
- With C (upcoming): C filters at the Ticketmaster source; you also guard datetime >= now in-query (defense in depth).
- With A: ship each route as a typed stub from seed; confirm booked -> taken so A's deck drops it.
- Every merge to main: update README + PROGRESS.md.
