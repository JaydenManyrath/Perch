# 06 - Deliver the fresh Perch deck, swipes, and Saved Perches

**What to build:** Give an Intern a deterministic deck of complete Fresh Listings, record one left or right decision per listing, and keep every right-swiped Saved Perch visible with its current availability.

**Blocked by:** 02 - Lock the core Round 2 schema and authorization boundary.

**Status:** done

- [x] Shared Person A contract types add UserType and ListingStatus to rows and add the exact PerchCard, deck, swipe input and response, and Saved Perches response shapes.
- [x] `GET /api/perches` requires authentication, is rate-limited, and returns exactly `{ deck: PerchCard[] }`.
- [x] The deck query itself requires status `available`, expiry later than the database current time, a non-empty address, coordinates, both lease dates, and lease type.
- [x] The deck query excludes every listing already swiped by the caller, whether the recorded direction is left or right.
- [x] Stale, taken, pending, expired, and incomplete rows never appear in the deck even if a Person C freshness job has not run.
- [x] Deck ranking is deterministic with a stable tie-break.
- [x] Every card has `kind: "listing"`, required freshness and provenance metadata, a deterministic review summary, and a nullable host projection.
- [x] Auto-sourced rows return `host: null`; Subletter-posted rows return the owning Subletter's public host fields.
- [x] PerchCard responses omit raw `created_by` and legacy `source` fields and expose the frozen `sourceName` field instead.
- [x] `POST /api/perches/swipe` accepts only a valid listing ID and left or right direction, returns `200 SwipeResponse`, and is Intern-only.
- [x] Repeating the same swipe leaves one database row and returns the same effective result.
- [x] `GET /api/perches/saved` returns exactly `{ saved: PerchCard[] }` for right swipes only and does not apply the deck freshness filter.
- [x] A Saved Perch remains present with current metadata after becoming pending, taken, stale, or expired.
- [x] Route and direct-database tests reject Subletter swipes, forged ownership, and cross-Intern reads or writes.
- [x] Idempotent demo seed data includes Interns, Subletters, complete and incomplete listings, all availability states, a near-expiry listing, and left and right swipes without colliding with Person C source identities.
