# 12 - Read and add comments on events

**What to build:** Let authenticated users read an event's discussion and let an Intern add a comment whose event and author are guaranteed by the server and database.

**Blocked by:** 03 - Lock the comments and Friendship schema boundary.

**Status:** done

- [x] Shared Person A contract types include the exact EventComment and `EventCommentsResponse` shapes.
- [x] `GET /api/events/{id}/comments` requires authentication, is rate-limited, and returns not found for a missing event.
- [x] GET returns exactly `{ comments: EventComment[] }` with public author projections and deterministic ordering.
- [x] `POST /api/events/{id}/comments` is rate-limited, Intern-only, validates the body, and returns 201 with the frozen EventComment shape.
- [x] The server derives event ID from the route and author ID from the authenticated session; conflicting body fields cannot override either value.
- [x] The database foreign key rejects a comment for a missing event even when the API route is bypassed.
- [x] A Subletter, another author, and a caller forging `author_id` cannot create or mutate the comment.
- [x] Authenticated readers can read comments without gaining write access to another author's row.
- [x] Idempotent seed comments attach to seeded events and use Intern authors.
