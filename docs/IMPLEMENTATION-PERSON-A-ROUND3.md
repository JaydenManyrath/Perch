# Perch Round 3 - Implementation Plan: PERSON A (all consumer UI)

Mission: layer the Round 3 UI onto the shipped Round 1 + 2 app - render upcoming-event images, a comprehensive sublet detail (pros + furnished + bed/bath/sqft), roommate grouping, the booking flow UI, a realistic finance breakdown, a fuller checklist, removal of onboarding percentages, and richer map-marker info on press. Build on fixtures first so nothing blocks on B or C.

Branch: person-a. You own every consumer surface; Person B owns schema + core CRUD APIs; Person C owns integrations + AI. You consume routes from B and C via the frozen shapes.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 13 (frozen seams + types) and the ownership map 13.10; docs/PROGRESS.md (your tasks RA31..RA38); the shipped code you are extending.

Working agreements (contract 11.12 / 13.11): plain ASCII (no emojis, no em/en dashes); update README + docs/PROGRESS.md every merge; consume the section 13.9 types from lib/types/contract.ts (add them if missing, never fork a local shape); mascot stays OFF decision surfaces (money, listings, booking, map decisions); WCAG (ink.strong body text, never baby-blue-on-white); functional colors unmuted.

## 1. Scope - what Person A owns in Round 3

- RA31 Event images. components/feed/EventCard.tsx renders events.image_url prominently (16:9) with a graceful placeholder when absent. Only upcoming events show (B/C guarantee this). Outcome: every feed event shows its picture.
- RA32 Comprehensive sublet detail + pros + furnished. components/stories/PerchDetailSheet.tsx renders the ListingDetail (section 13.9): a clear "Furnished" / "Unfurnished" line (not buried in prose), a "Pros" bullet list, bedrooms/bathrooms/sqft, amenities chips, utilities-included. components/post/PostListingForm.tsx adds inputs for all of these. Outcome: a perch detail is rich and scannable; subletters can enter it.
- RA33 Roommate grouping. On a saved perch or an in-progress booking, an "Add a roommate" action that picks from your accepted friends, and a grouped view showing roommates on that sublet. Consumes the roommate invite/accept API. Outcome: two interns can share one sublet.
- RA34 Booking flow. "Request to book" on the perch detail; an owner approval inbox (in app/(shell)/post or a bookings view) to approve/decline; a booked state; once booked, the perch leaves the swipe deck and shows "taken" on the map/profile. Consumes the bookings API (section 13.4). Outcome: you can actually claim a place and it disappears for everyone else.
- RA35 Finance breakdown. Show take-home vs salary, cost-of-living, upfront cash, and relocation stipend wherever money appears: the onboarding summary (app/onboarding/_steps/OfferStep.tsx / DoneStep.tsx), the negotiation/budget readout, and a perch's affordability line. Consumes GET /api/finance (FinanceBreakdown). Clean and information-first; no mascot on money. Outcome: money is realistic, not "salary = budget".
- RA36 Fuller checklist. components/profile/PreflightChecklist.tsx renders the added items (flights, shipping, what-to-bring, parking/car) grouped by category when present. Outcome: the checklist covers real relocation tasks.
- RA37 Remove onboarding percentages. In app/onboarding/_steps/OfferStep.tsx drop the per-field confidence shown as a percent - replace with a simple "check this" flag on needsReview fields. In components/onboarding/ProgressStepper.tsx use step dots/labels, not a percent. Outcome: no percentages anywhere in onboarding.
- RA38 Map marker info on press. Pressing any marker in components/map/ opens a richer info sheet: places show kind + the "N min from your usual coffee spot" line; listings show price + furnished + pros + status + a link to the full detail; events show date/venue/going count + a link; comments show author + text; stickers show category + note. Extend the existing sheets (PlaceStickerSheet.tsx, EventPreviewSheet.tsx, CommentSheet.tsx) or add a unified marker info sheet. Outcome: tapping the map is informative, not just a name.

### NOT yours
- Person B (docs/IMPLEMENTATION-PERSON-B-ROUND3.md): the listings columns + GET /api/listings/{id}; the bookings table + state machine + API; roommate_ids + invite/accept API; the deterministic finance model + GET /api/finance; the checklist seed; feed/events upcoming guards; marker detail payloads.
- Person C (docs/IMPLEMENTATION-PERSON-C-ROUND3.md): Ticketmaster upcoming-only + image capture; offer parser stipend/bonus extraction; the cost-of-living data source; optional external place-details lookup.

## 2. What you consume (frozen shapes, contract 13.9)

| Interface | Contract | You use it in | If not ready |
|---|---|---|---|
| GET /api/listings/{id} -> ListingDetail | 13.2 | RA32 detail sheet | local ListingDetail fixture |
| POST /api/listings/{id}/book, /api/bookings/* | 13.4 | RA34 booking | local booking state |
| roommate invite/accept | 13.3 | RA33 grouping | local roster |
| GET /api/finance -> FinanceBreakdown | 13.5 | RA35 finance UI | local FinanceBreakdown fixture |
| checklist_items (+ category), event image_url, marker payloads | 13.1/13.6/13.8 | RA31/RA36/RA38 | extend existing fixtures |

Extend lib/fixtures/* and lib/data/source.ts with getters for the new shapes; develop on NEXT_PUBLIC_DATA_SOURCE=fixture, wire live behind env, degrade gracefully when a route/key is missing.

## 3. Build phases (commit after each; update PROGRESS + README each merge)

- Phase R3A-1 Types + fixtures + data source: add the 13.9 types to lib/types/contract.ts; add fixtures (ListingDetail, Booking, FinanceBreakdown, fuller checklist, event image); wire getters in lib/data/source.ts.
- Phase R3A-2 Sublet detail + post form (RA32) + event images (RA31): the rich PerchDetailSheet + PostListingForm fields; EventCard image + placeholder.
- Phase R3A-3 Booking flow (RA34) + roommate grouping (RA33): request-to-book, owner approval inbox, booked state that removes the perch from the deck; add-a-roommate + grouped view.
- Phase R3A-4 Finance UI (RA35): FinanceBreakdown in onboarding + budget + perch affordability.
- Phase R3A-5 Checklist (RA36) + onboarding percentages (RA37): fuller grouped checklist; strip percents from OfferStep + ProgressStepper.
- Phase R3A-6 Map marker info (RA38): richer info sheets on press.

Each phase: run typecheck + lint + next build, run the app, and drive the surface (open it, interact, confirm the acceptance below). Fix before committing.

## 4. Definition of done + demo checklist

Done when: feed events show pictures and are upcoming; the perch detail shows furnished + pros + bed/bath/sqft + amenities + utilities and the post form collects them; you can request-to-book, an owner can approve, and a booked perch leaves the deck; a roommate can be grouped onto a sublet; the finance breakdown (take-home vs salary, COL, upfront, stipend) shows in onboarding/budget/affordability; the checklist includes flights/shipping/what-to-bring/parking-car grouped by category; onboarding shows no percentages; pressing any map marker opens a rich info sheet. All on fixture and on live where B/C routes exist. No emoji/em-dash in UI strings; README + PROGRESS updated.

Demo: open the feed (upcoming events with images) -> open a perch (furnished, pros, details) -> request to book, approve as owner, watch it leave the deck -> add a roommate -> see the finance breakdown -> open the checklist (flights/shipping/etc.) -> onboarding has no percents -> tap map markers for full info.

## 5. Integration checkpoints
- Types freeze: land the 13.9 types in lib/types/contract.ts and tell B/C.
- Route stubs first: B ships each route as a typed stub from seed; you swap fixture -> live with no code change.
- Booking removal: confirm with B that a booked listing sets status=taken so your deck (GET /api/perches) drops it; still guard client-side.
- Finance: consume GET /api/finance as the single source of the money numbers; do not recompute client-side.
- Every merge to main: update README + PROGRESS.md.
