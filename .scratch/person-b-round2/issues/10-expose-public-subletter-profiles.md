# 10 - Expose caller-sensitive public Subletter profiles

**What to build:** Let an authenticated viewer open a person's public profile while showing a Subletter's reviews and listings under the correct freshness visibility rules.

**Blocked by:** 06 - Deliver the fresh Perch deck, swipes, and Saved Perches; 08 - Create valid reviews with deterministic summaries.

**Status:** done

- [x] Shared Person A contract types include the exact `PublicProfile` shape with optional Subletter review summary and listings.
- [x] `GET /api/users/{id}` requires authentication, is rate-limited, and returns not found for an unknown profile ID.
- [x] The user projection contains only ID, name, role, city, company, and avatar URL plus user type and banded status at the wrapper level.
- [x] No taste profile, move date, raw verification field, ownership field, provenance internals, or other non-contracted data leaks.
- [x] An Intern profile omits `reviewSummary` and `listings` rather than returning misleading empty Subletter sections.
- [x] A Subletter profile includes the deterministic review summary for that Subletter Review Subject.
- [x] A viewer other than the profile owner receives only listings whose status is available and whose expiry is in the future.
- [x] The profile-owning Subletter receives all of their listings, including pending, taken, stale, and available-but-expired rows.
- [x] Every returned listing uses the authoritative PerchCard mapping, including `kind: "listing"`, current status, current freshness metadata, and no raw `created_by` or legacy source.
- [x] Tests compare owner and non-owner responses against the same seeded Subletter and prove the visibility difference.
