# Perch Round 2 - Implementation Plan: PERSON C (Integrations + AI)

Mission: own everything that reaches OUT, runs in the BACKGROUND, or does AI/heuristic parsing - the automatic sublet-sourcing pipeline and freshness jobs, the Ticketmaster events integration, and the hardened offer parser (broader formats + OCR + confidence). You build ON TOP of Person B's schema; Person A renders what you produce.

Branch: person-c. You are Person C. Round 2 is split THREE ways: A = all UI, B = schema + core CRUD APIs, C = integrations + AI (you).

Boundary with Person B: B owns the database (migrations, RLS, seed) and the synchronous CRUD routes. You own the pipelines, background jobs, external API clients, and parsing. You do NOT write migrations - when you need a column, B adds it (schema in the contract first). You WRITE INTO B's tables (sourced listings, Ticketmaster events) and keep them fresh; B's routes read them.

Read together, do not restate them:
- docs/FOUNDATION-CONTRACT.md section 11 (frozen tables, routes, types) and the ownership map 11.11.
- docs/SOURCING-PROPOSAL.md - YOU own it; implement it.
- docs/IMPLEMENTATION-PERSON-B-ROUND2.md (the schema + routes you build against) and docs/IMPLEMENTATION-PERSON-A-ROUND2.md (who renders your data).
- The shipped code, especially lib/parsers/offerLetter.ts, app/api/parse/offer/route.ts, lib/fixtures/events.ts, and lib/llm/ratelimit.ts.

Working agreements (contract 11.12): plain ASCII only; update README + docs/PROGRESS.md every merge; add any new frozen type (11.10) to lib/types/contract.ts in the same PR; least-privilege read-only external keys; rate-limit every route; secrets in gitignored .env; OCR/broader parsing must NEVER invent a number - low-confidence fields come back flagged, not guessed. Deterministic where it counts: dedupe keys and the freshness state machine are code, never the model.

---

## 1. Scope - what Person C owns in round 2

- RC1 Sourcing pipeline (SOURCING-PROPOSAL.md). lib/sourcing/ with a SourceAdapter interface, a seed/mock adapter that emits believable area sublets, normalize (RawListing -> a listings insert on B's columns: sourced=true, source_name, external_id, status='available', expires_at), dedupe (unique (source_name, external_id) + fuzzy address/price), and ingest (run adapters -> normalize -> dedupe -> upsert). Trigger via POST /api/admin/source-listings (service-role only). Real scraping of third-party sites is OUT of scope for the dev demo (ToS/legal); the adapter interface is the seam for real sources later.
- RC2 Freshness jobs. lib/sourcing/freshness.ts: a deterministic expiry pass that flips available rows past expires_at to stale, and a "still available?" ping dispatch that flags near-expiry subletter listings for a confirm request (auto-sourced rows have no owner and simply expire). Run via a cron/route (app/api/cron/expire-listings). Person B owns the synchronous POST /api/listings/{id}/confirm that a subletter calls to refresh; you own the background aging.
- RC3 Ticketmaster integration. lib/events/ticketmaster.ts: a Discovery API client (server-side, keyed, read-only, rate-limited). GET /api/events/nearby?lat=&lng=&radius= fetches nearby events and upserts them into B's events table (fill venue/url/image_url/price_range/category/external_id; dedupe on external_id), with a seeded fallback when no key or quota so the feed never breaks. B's feed route reads these; A renders them.
- RC4 Offer parser hardening. Extend lib/parsers/offerLetter.ts beyond the one clean PDF format; add lib/parsers/ocr.ts for scanned/image PDFs behind an OCR flag; return per-field confidence (0..1) + needsReview (fields below threshold) from POST /api/parse/offer. Never invent a number; low-confidence fields are flagged for A's manual-correction UI. Keep the deterministic-extraction-first principle; the LLM only normalizes ambiguous text, never fabricates.
- RC5 Demo data via the pipeline. Seed sourced listings by running the seed adapter (idempotent), and pre-load a set of Ticketmaster-shaped events (real fetch when keyed, otherwise fixtures) including a couple near a demo user. Include one near-expiry sourced/subletter listing so the freshness ping + confirm flow demos. Coordinate with B's base seed so ids/keys do not collide.

### NOT yours
- Person B (docs/IMPLEMENTATION-PERSON-B-ROUND2.md): all migrations, RLS, the tables/columns you write into, and the synchronous CRUD routes (perches deck/swipe/saved, listings post/confirm, reviews, attendance, users profile, feed additions, base seed). You never write a migration; you request a column and B adds it.
- Person A (docs/IMPLEMENTATION-PERSON-A-ROUND2.md): all UI - the swipe deck, status badges, event card + map pins, and the offer manual-correction UI that renders your confidence/needsReview.

---

## 2. What you depend on / expose

- You DEPEND on Person B: the schema. You need the listings freshness/sourcing columns (contract 11.2) and the events Ticketmaster columns (11.6) to exist before you write. Agree the column set with B up front; B lands the migration, you build on it. Until then, develop against a local Supabase with B's 0006/0007 applied, or a fixture table.
- You EXPOSE to Person B: populated data. Your pipeline fills listings (sourced) and events (Ticketmaster) so B's perches/feed routes have real rows; your freshness job keeps status accurate (B also guards in-query).
- You EXPOSE to Person A: rendered content - Ticketmaster events (venue/image/category for cards + pins), offer confidence/needsReview (for the correction UI), and fresh sourced listings (appear in B's deck). A only depends on the frozen shapes.
- Secrets: TICKETMASTER_API_KEY (read-only), OCR flags/keys, and any admin/cron secret go in gitignored .env; document them in docs/SECRETS.md and .env.example. Rate-limit /api/events/nearby, /api/parse/offer, /api/admin/source-listings.

---

## 3. Repo additions (extend the shipped tree)

```
lib/sourcing/
  types.ts            # SourceAdapter interface + RawListing (SOURCING-PROPOSAL.md)
  adapters/seedAdapter.ts
  normalize.ts        # RawListing -> listings insert on B's columns
  dedupe.ts           # unique (source_name, external_id) + fuzzy guard
  ingest.ts           # run adapters -> normalize -> dedupe -> upsert
  freshness.ts        # expiry state machine + ping dispatch
lib/events/ticketmaster.ts     # Discovery API client (keyed, read-only)
lib/parsers/ocr.ts             # OCR for scanned/image PDFs (behind a flag)
lib/parsers/offerLetter.ts     # extend: broader formats + confidence + needsReview
app/api/events/nearby/route.ts         # RC3 fetch + upsert (+ fallback)
app/api/admin/source-listings/route.ts # RC1 trigger ingest (service-role)
app/api/cron/expire-listings/route.ts  # RC2 expiry pass + ping dispatch
app/api/parse/offer/route.ts           # RC4 update response: confidence + needsReview
```
Add any new frozen type to lib/types/contract.ts (coordinate with B, who lands most of 11.10). Rate-limit every route.

---

## 4. Build phases (test-first where it pays; commit after each; update PROGRESS.md + README each merge)

### Phase R2C-0 - Schema handshake (with B)
- Agree the listings freshness/sourcing columns (11.2) and events Ticketmaster columns (11.6) with B; B lands 0006/0007. You build against them. Do not proceed to writes until the columns exist.
- Acceptance: a local db reset has B's columns; you can insert a sourced listing and a Ticketmaster-shaped event by hand.

### Phase R2C-1 - Sourcing pipeline (RC1)
- lib/sourcing per SOURCING-PROPOSAL.md: SourceAdapter + seedAdapter (believable area sublets), normalize (reuse the shipped safety_flags heuristics), dedupe (unique + fuzzy), ingest. POST /api/admin/source-listings (service-role) runs it.
- Tests: ingest twice is idempotent (dedupe); normalize maps every RawListing field; a bad row is skipped, not crashed.
- Acceptance: running the admin trigger fills the area with sourced listings; re-running adds nothing (idempotent); rows carry sourced=true + source_name + external_id + expires_at.

### Phase R2C-2 - Freshness jobs (RC2)
- freshness.ts: deterministic expiry pass (available past expires_at -> stale) and ping dispatch (flag near-expiry subletter listings; auto-sourced simply expire). app/api/cron/expire-listings runs the pass.
- Acceptance: a past-due listing flips to stale; a near-expiry subletter listing is flagged for a confirm; B's confirm route (called separately) returns it to available. B's deck never shows stale.

### Phase R2C-3 - Ticketmaster integration (RC3)
- lib/events/ticketmaster.ts Discovery client (read-only, keyed, rate-limited). GET /api/events/nearby upserts nearby events into B's events table (dedupe on external_id; fill venue/url/image_url/price_range/category), with a seeded fallback when no key/quota (never crash the feed).
- Acceptance: nearby events populate from Ticketmaster or fall back to seed; re-fetching de-dupes; B's feed + A's card/pins show venue/image/category; the key never reaches the client.

### Phase R2C-4 - Offer parser hardening (RC4) + demo data (RC5)
- Parser: broaden extraction beyond the one clean format; lib/parsers/ocr.ts for scanned/image PDFs behind an OCR flag; return confidence + needsReview from POST /api/parse/offer. Never invent a number.
- Demo data: run the seed adapter for sourced listings; pre-load Ticketmaster-shaped events (keyed or fixtures) near a demo user; include one near-expiry listing. Coordinate ids with B's base seed.
- Acceptance: a scanned sample PDF parses via OCR with low-confidence fields flagged (A can correct them); the demo dataset shows fresh sourced listings, real-looking events, and a listing that can go stale then be confirmed back.

---

## 5. Definition of done + demo checklist

Done when:
- Sourcing ingest is idempotent and fills the area on B's schema; the freshness expiry + ping work; B's deck only serves fresh listings.
- Ticketmaster events populate with a seeded fallback and de-dupe on external_id; the key stays server-side.
- The offer parser returns confidence + needsReview and handles a scanned PDF via OCR without inventing numbers.
- /api/events/nearby, /api/admin/source-listings, /api/cron/expire-listings, and the updated /api/parse/offer are rate-limited; secrets documented in .env.example + SECRETS.md.
- Demo dataset makes A's surfaces look alive; README + PROGRESS.md updated each merge.

Demo checklist (drive it):
1. Run source-listings; watch fresh area sublets appear in B's deck; run the expiry pass to force one stale; confirm it back via B's route.
2. Pull nearby Ticketmaster events (or fallback); see them in the feed and as map pins with venue/image.
3. Parse a scanned offer; low-confidence fields come back flagged for A's correction UI.

---

## 6. Integration checkpoints

- With Person B (schema handshake, FIRST): agree and land the listings + events columns before you write; schema changes go through the contract and B's migration.
- With Person B (freshness boundary): you age rows in the background; B guards freshness in-query and owns the confirm route. Confirm a stale row never surfaces.
- With Person B (seed): coordinate ids/keys so your sourced listings + Ticketmaster events do not collide with B's base seed.
- With Person A: A renders your events, confidence/needsReview, and sourced listings via the frozen shapes; ship stubs/fixtures early so A never blocks.
- Every merge to main: update README + PROGRESS.md.

---

## 7. Round 2 - Batch 2 (additional integrations, contract section 12)

Still Round 2. Your batch-2 work is the commute-route feature's external pieces: the Mapbox Directions route, geocoding the office, and searching POIs along the route. Person B owns the deterministic along-route filter and the schedule; Person A renders the colored route + selections. Same rules: Mapbox key server-side and least-privilege, rate-limit routes, seeded fallbacks so nothing breaks live.

- RC6 Route directions. lib/routing/mapbox.ts: a Mapbox Directions client. POST /api/route { officeLat, officeLng, apartmentLat, apartmentLng } -> RouteResponse { geometry (GeoJSON LineString), distanceMeters, durationSeconds }. Fallback to a straight-line LineString + haversine estimate when there is no key/quota, so the map always draws a route. Rate-limited; key server-side.
- RC7 Office geocode. Derive the office location from the user's employer (from the offer parse). lib/routing/geocode.ts geocodes the employer/company via Mapbox Geocoding; fall back to a seeded per-company coordinate table for the demo. Feeds the route origin in RC6 so A never has to ask the user for the office address.
- RC8 POI search along route. lib/routing/pois.ts: given the route geometry and kinds (coffee, gym), search Mapbox for candidate POIs near the corridor and return them for Person B's deterministic /api/route/pois to merge with the user's own places. Optional for the demo (B can filter the user's existing places alone); wire it behind the Mapbox key with a seeded fallback.

Boundary reminder: you produce the geometry and candidate POIs; B computes which lie along the route and builds the schedule; A renders. You never write the schedule or the deterministic filter.

Acceptance (batch 2): POST /api/route returns a real Mapbox route when keyed and a straight-line fallback otherwise; the office geocodes from the employer (or seeded coords); POI search returns coffee/gym candidates near the route (or B proceeds with the user's own places); keys stay server-side; routes rate-limited; README + PROGRESS.md updated on merge.
