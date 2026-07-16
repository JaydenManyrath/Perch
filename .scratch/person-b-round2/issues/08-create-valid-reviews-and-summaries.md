# 08 - Create valid reviews with deterministic summaries

**What to build:** Let an Intern read and maintain one review of an existing listing or Subletter and always receive the complete review list with a deterministic rating summary.

**Blocked by:** 02 - Lock the core Round 2 schema and authorization boundary.

**Status:** done

- [x] Shared Person A contract types include the exact Review Subject, Review, ReviewSummary, and `ReviewsResponse` shapes.
- [x] `GET /api/reviews` requires authentication, is rate-limited, validates both subject query parameters, and returns exactly `{ reviews, summary }`.
- [x] A subject with no reviews returns `{ avgRating: 0, count: 0 }`.
- [x] Non-empty averages are computed from stored integer ratings and rounded deterministically to one decimal place.
- [x] Review ordering is stable for identical database state.
- [x] `POST /api/reviews` is Intern-only, rate-limited, and accepts only listing or Subletter subjects plus a rating from 1 through 5 and review body.
- [x] The first POST creates one review; a later POST by the same Intern for the same subject updates that row rather than creating a duplicate.
- [x] POST returns 200 with the complete current `ReviewsResponse`, including reviews by other Interns and the recomputed summary.
- [x] Both route tests and direct-database tests reject a missing listing, a missing user, and an Intern falsely declared as a Subletter Review Subject.
- [x] A Subletter, another reviewer, or a caller forging `reviewer_id` cannot create or mutate the review.
- [x] Idempotent seed reviews are clearly identified as demo content and produce known aggregate counts and one-decimal averages.
