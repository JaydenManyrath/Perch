# Sourcing Proposal - Automatic Sublet Sourcing + Freshness

Owner: Person B. Status: proposed (round 2). Frozen seams: FOUNDATION-CONTRACT.md §11.2 to §11.4.

## Goal

Interns should NOT have to enter listings by hand. Perch should fill the area with sublets automatically and keep them fresh, so the swipe deck (§11.3) always shows real, currently-available places.

Two supply sources feed one `listings` table:
1. Auto-sourced listings (this proposal): pulled by a background pipeline, `sourced=true`.
2. Subletter-posted listings (§11.4): a subletter posts directly, `sourced=false`.

## Scope decision (demo vs production)

Live scraping of Craigslist / Facebook / Zillow / etc. is OUT of scope for the dev-mode demo: it violates most sites' Terms of Service, breaks constantly, and carries legal risk. Instead we build a clean adapter interface and ship a seed/mock adapter that produces believable area listings for the demo. Real sources become additional adapters later (some have official APIs; most do not). This keeps the demo honest and the architecture ready.

## Architecture

```
lib/sourcing/
  types.ts          # SourceAdapter interface + RawListing
  adapters/
    seedAdapter.ts  # demo: emits believable Seattle sublets on a schedule
    # future: officialApiAdapter.ts, partnerFeedAdapter.ts (real sources)
  normalize.ts      # RawListing -> ListingRow insert (geocode, price, lease dates)
  dedupe.ts         # unique (source_name, external_id); fuzzy address/price guard
  ingest.ts         # run all enabled adapters -> normalize -> dedupe -> upsert
  freshness.ts      # expiry state machine + "still available?" ping dispatch
```

### SourceAdapter interface (proposed)

```ts
export type RawListing = {
  externalId: string;        // adapter-native id (dedupe key)
  title: string;
  address: string;
  price: number;             // USD/mo
  leaseStart?: string;       // ISO
  leaseEnd?: string;         // ISO
  photos: string[];
  rawText?: string;          // for safety heuristics
};

export interface SourceAdapter {
  name: string;                              // -> listings.source_name
  fetchArea(city: string, opts?: { limit?: number }): Promise<RawListing[]>;
}
```

`ingest.ts` runs every enabled adapter, normalizes each `RawListing` into a `listings` insert (`sourced=true`, `source_name=adapter.name`, `external_id`, `status='available'`, `expires_at=now()+FRESH_DAYS`), applies the existing deterministic `safety_flags` heuristics, de-dupes on `(source_name, external_id)` plus a fuzzy address+price guard, and upserts. It runs on demand (`POST /api/admin/source-listings`, service-role only) and can be scheduled.

## Freshness state machine

Sublets get taken; a stale listing kills trust. Each listing has `status`, `expires_at`, `last_confirmed_at`.

```
available --(expires_at passed, no confirm)--> stale
available --(subletter/intern marks taken)---> taken
available --(pending inquiry)-----------------> pending --> available | taken
stale     --(subletter confirms)-------------> available (expires_at bumped)
```

Rules (deterministic, in `freshness.ts`):
- On ingest/post: `status='available'`, `expires_at = now() + FRESH_DAYS` (demo: 7).
- A daily expiry job flips `available` rows past `expires_at` to `stale`.
- "Still available?" ping: for rows nearing expiry, dispatch a confirm request to the subletter (auto-sourced rows have no owner to ping, so they simply expire to `stale`). `POST /api/listings/{id}/confirm` sets `last_confirmed_at=now()`, `status='available'`, and bumps `expires_at`.
- The swipe deck (`GET /api/perches`) returns ONLY `status='available'` rows not past `expires_at`. `taken`/`stale`/expired never surface for swiping; they may still be viewable by direct link with a clear status badge.

## Ownership split

- Person B: everything above (adapters, ingest, dedupe, freshness job, ping dispatch, the admin/source route, and the `listings` columns from §11.2). Deterministic rules in code; no LLM decides a status.
- Person A: renders `status` as a badge, offers the subletter confirm/relist affordance, and never shows a stale/taken listing in the swipe deck.

## Demo behavior

- The seed adapter pre-populates a believable set of area sublets so the deck is full on first open.
- A "refresh sourcing" admin action re-runs ingest live (idempotent via dedupe) to show new listings landing.
- One seeded listing is deliberately near expiry to demo the "still available?" ping and the confirm-back-to-available flow.

## Open questions

- FRESH_DAYS and ping timing for production (demo uses 7 days).
- Whether any real source has a usable official API worth a second adapter post-demo.
- Geocoding provider for real addresses (demo listings carry lat/lng directly).
