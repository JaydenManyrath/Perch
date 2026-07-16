# 02 - Lock the core Round 2 schema and authorization boundary

**What to build:** Establish the complete core Round 2 database boundary for Interns, Subletters, Fresh Listings, Listing Provenance, swipes, reviews, and private attendance so Person A can use safe synchronous APIs and Person C can write trusted sourcing and event data.

**Blocked by:** 01 - Make RLS tests discover every migration.

**Status:** done

- [x] Users gain a non-null `user_type` that defaults to `intern` and accepts only `intern` or `subletter`.
- [x] Existing listings are backfilled before constraints are enforced: status is `available`, expiry is seven days in the future at migration time, sourced is false, and source name comes from the legacy source or `seed`.
- [x] Every listing has non-null status, expiry, sourced, and source name values; source URL and external ID remain nullable.
- [x] Listing status accepts only available, pending, taken, or stale, and `(source_name, external_id)` prevents duplicate non-null source records.
- [x] Events gain nullable external ID, URL, venue, image URL, and price range fields, with `(source, external_id)` preventing duplicate non-null integration records.
- [x] Listing swipes enforce one row per Intern and listing plus a left-or-right direction; reviews enforce one row per Review Subject and reviewer plus ratings from 1 through 5; attendance enforces one row per event and Intern with row presence meaning going.
- [x] Foreign keys and indexes cover the ownership, subject, event, listing, freshness, and lookup paths used by the frozen APIs.
- [x] Every new public table has RLS enabled and forced, and an anonymous caller receives no rows.
- [x] The permissive Round 1 self-update policy is replaced so an authenticated user cannot set or change `verified` or `user_type`, including during direct profile insertion, while ordinary self-profile edits still succeed.
- [x] The permissive Round 1 listing owner policies are replaced so only a Subletter may own user-authored listings and a foreign Subletter cannot edit or delete them.
- [x] Direct authenticated writes cannot change `created_by`, `sourced`, legacy `source`, `source_name`, `source_url`, `external_id`, `status`, `expires_at`, or `last_confirmed_at`; the owning Subletter can still update user-authored listing content.
- [x] Direct authenticated review writes reject a missing listing Review Subject and reject a user whose type is not Subletter when the declared subject is `subletter`.
- [x] A Subletter cannot create or mutate listing swipes, reviews, or event attendance, even with a forged Intern ID in the row.
- [x] An Intern cannot read or mutate another Intern's swipe or attendance rows, and cannot mutate another Intern's review.
- [x] A guarded server-side attendance aggregation path returns correct counts without granting authenticated users raw access to other attendee rows.
- [x] A service-role sourcing write can create an auto-sourced listing with `created_by = null`, and a service-role event upsert can populate the Person C integration columns without weakening authenticated-client policies.
- [x] Database reset and the expanded adversarial RLS suite both complete successfully.
