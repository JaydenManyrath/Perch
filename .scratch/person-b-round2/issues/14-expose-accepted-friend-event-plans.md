# 14 - Expose event plans only for accepted Friends

**What to build:** Show an Intern which accepted Friends are going to events while preserving the privacy of attendance belonging to pending Friends and strangers.

**Blocked by:** 09 - Keep attendance private while exposing guarded counts; 13 - Resolve canonical Friend Requests.

**Status:** done

- [x] Shared Person A contract types include the exact FriendNote and `{ notes: FriendNote[] }` response shapes.
- [x] `GET /api/friends/notes` requires authentication, uses the shared rate limiter, and derives the viewer solely from the authenticated session.
- [x] The query begins from accepted Friendships involving the caller before joining private attendance and events.
- [x] An accepted Friend with an attendance row produces the frozen public friend and event projections.
- [x] A pending Friend Request produces no note in either direction.
- [x] A stranger's attendance produces no note even when the caller knows the event or attendee ID.
- [x] A Subletter receives no Friend event plans and cannot use query parameters to impersonate an Intern.
- [x] The response exposes no raw attendance row, attendee list, Friendship participant IDs, or non-contracted event fields.
- [x] Output ordering is deterministic for multiple Friends and events.
- [x] Adding or removing an accepted Friend's attendance row changes the next response without exposing any other attendee identity.
- [x] The route reads events populated by Person C but performs no Ticketmaster request or background synchronization.
