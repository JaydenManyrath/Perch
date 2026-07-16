# Perch Round 3 - Implementation Plan: PERSON C (integrations + AI)

Mission: own the Round 3 external and AI pieces - fix Ticketmaster to return upcoming events with images, extend the offer parser to extract relocation stipend and signing bonus (upfront cash), and provide a cost-of-living data source that Person B's finance model consumes. You reach OUT and parse; B owns the schema and the deterministic model; A renders.

Branch: person-c. Boundary with B: schema and deterministic logic are B; anything that calls a third party or does AI/heuristic parsing is you. You WRITE INTO B's columns (event image_url) and PROVIDE data (cost-of-living index, parsed stipend/bonus) that B's routes consume.

Read together (do not restate): docs/FOUNDATION-CONTRACT.md section 13 (frozen seams + types); docs/IMPLEMENTATION-PERSON-B-ROUND3.md (the schema + finance model you feed); docs/PROGRESS.md (RC31..RC34); the shipped code, especially lib/events/ticketmaster.ts and lib/parsers/offerLetter.ts.

Working agreements (11.12 / 13.11): plain ASCII; update README + PROGRESS every merge; least-privilege read-only external keys server-side; rate-limit routes; the parser may EXTRACT stipend/bonus text but never INVENTS a number - low-confidence fields come back flagged.

## 1. Scope - what Person C owns in Round 3

- RC31 Ticketmaster: upcoming-only + images. Fix lib/events/ticketmaster.ts so the Discovery call returns UPCOMING events only: pass startDateTime = now (and an end window, e.g. now + 90 days), sort ascending by date, and drop anything already past. Capture the best image_url into events.image_url (prefer a 16:9 / largest usable image; skip Ticketmaster's low-res or "TABLET"/"RECOMENDATION" oddities). Keep the seeded fallback, but the fallback events must also be upcoming (relative to a passed-in "now", since the app cannot call Date.now server-side in some contexts - accept now as a parameter). Outcome: the feed shows real upcoming events, each with a picture.
- RC32 Offer parser: stipend + upfront cash. Extend lib/parsers/offerLetter.ts to also extract relocationStipend and signingBonus (upfront cash) when present in the offer letter, with per-field confidence like the existing fields. Add them to OfferParse (section 13.9 additions). Never invent a number; if absent or low-confidence, return null / flag for review. Outcome: onboarding captures relocation stipend and signing bonus for the finance model.
- RC33 Cost-of-living data source. lib/finance/costOfLiving.ts: a per-city cost-of-living index (100 = national average) + median rent, backed by a seeded city table (a curated dataset of the demo cities) with an optional external lookup behind a key. Expose getCostOfLiving(city) -> { city, index, medianRent }. B's finance model (lib/finance/model.ts) consumes this. Outcome: budgets are cost-of-living-aware, deterministic, and never crash without a key.
- RC34 (optional) Map place-details lookup. If A's richer map info sheet (RA38) needs details beyond what B stores (e.g. a POI's hours/rating), add a Mapbox place-details lookup behind the Mapbox key with a graceful fallback. Optional for the demo; only build if A asks.

### NOT yours
- Person B: all schema/migrations/RLS, the bookings state machine, the deterministic finance model + GET /api/finance, the checklist seed, the upcoming in-query guard. You PROVIDE the cost-of-living index and the parsed stipend/bonus; B computes the money.
- Person A: all UI (event image render, finance breakdown display, onboarding percent removal, map info sheet).

## 2. What you depend on / expose
- You DEPEND on B: the events.image_url column (exists, round 2) and any new columns; agree the cost-of-living index shape and the OfferParse stipend/bonus additions with B before wiring.
- You EXPOSE to B: getCostOfLiving(city) and the parsed relocationStipend/signingBonus - B's finance model and onboarding consume them.
- You EXPOSE to A: upcoming events with images (via B's feed/events routes) and the parsed stipend/bonus (via onboarding).
- Secrets: TICKETMASTER_API_KEY (exists), any cost-of-living or Mapbox place-details key, in gitignored .env; documented in docs/SECRETS.md and .env.example. Rate-limit any new route.

## 3. Build phases (test-first where it pays; commit after each; update PROGRESS + README each merge)
- Phase R3C-1 Ticketmaster upcoming + images (RC31): filter startDateTime >= now, sort ascending, drop past; capture best image_url; upcoming-only seeded fallback. Extend lib/events/ticketmaster.test.ts: no past event is returned; every returned event has an image or a documented null; ordering is ascending. Acceptance: /api/events/nearby (via B) returns only upcoming events with images.
- Phase R3C-2 Offer parser stipend/bonus (RC32): extend extraction + confidence; add to OfferParse. Test against a fixture offer letter that contains a relocation stipend + signing bonus and one that does not. Acceptance: the fields parse when present with confidence, and come back null/flagged when absent - never invented.
- Phase R3C-3 Cost-of-living source (RC33): lib/finance/costOfLiving.ts seeded city index + median rent; optional external lookup behind a key with fallback. Acceptance: getCostOfLiving returns a stable index for the demo cities with no key; B's finance model consumes it; nothing crashes keyless.
- Phase R3C-4 (optional) place-details (RC34) only if A requests it.

## 4. Definition of done + demo checklist
Done when: Ticketmaster returns only upcoming events, sorted, each with a captured image_url (seeded fallback also upcoming); the offer parser extracts relocationStipend + signingBonus with confidence and never invents; getCostOfLiving returns a deterministic index + median rent for the demo cities and B's finance model uses it; keys stay server-side; routes rate-limited; README + PROGRESS updated.

Demo: pull nearby events - all upcoming, all with pictures, soonest first; parse an offer with a relocation stipend + signing bonus - both come back with confidence; call the finance model for a high-COL city vs a low-COL city and show the budget differ.

## 5. Integration checkpoints
- With B (data handshake, FIRST): agree the cost-of-living index shape and the OfferParse stipend/bonus additions before B wires the finance model.
- With B (upcoming): you filter at the Ticketmaster source; B also guards datetime >= now in-query.
- With A: A renders the images and the finance numbers; ship the parse + events early so A can build on real-shaped data.
- Every merge to main: update README + PROGRESS.md.
