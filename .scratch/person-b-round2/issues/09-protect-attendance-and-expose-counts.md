# 09 - Keep attendance private while exposing guarded counts

**What to build:** Let an Intern answer the event going Y/N poll and see safe aggregate counts in the poll and Flyway feed without exposing who else is attending.

**Blocked by:** 02 - Lock the core Round 2 schema and authorization boundary.

**Status:** done

- [x] Shared Person A contract types use the final `AttendInput { going: boolean }` and `AttendResponse { going: number, viewerGoing: boolean }` shapes.
- [x] Feed contract types add nullable venue, URL, image URL, and price range fields plus `internsGoing` and `viewerGoing`.
- [x] `POST /api/events/{id}/attend` requires authentication, is rate-limited, and rejects a missing event or malformed going value.
- [x] `going: true` creates at most one row for the caller and event; repeating it remains idempotent.
- [x] `going: false` removes the caller's row if present and remains idempotent when no row exists.
- [x] The response `going` value is the current aggregate number of attendees and `viewerGoing` reflects the caller's row after the mutation.
- [x] Only an Intern can mutate attendance; a Subletter and a caller forging another user ID are denied.
- [x] A direct authenticated attendance query can return only the caller's own rows, never another attendee identity.
- [x] Guarded aggregation returns the correct total for multiple Interns despite owner-only direct reads.
- [x] `GET /api/feed` remains deterministically ranked and includes Person C event fields, aggregate count, and caller-specific `viewerGoing` for every item.
- [x] Feed and attendance code read rows populated by Person C but perform no Ticketmaster call, event sourcing, office resolution, or background work.
- [x] Seeded events and attendance make the aggregate and image passthrough verifiable without colliding with Person C external IDs.
