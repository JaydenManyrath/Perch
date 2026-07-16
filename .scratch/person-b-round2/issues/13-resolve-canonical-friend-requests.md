# 13 - Resolve canonical Friend Requests

**What to build:** Let Interns request, inspect, accept, and decline one canonical Friendship per pair, with resolution authority belonging only to the addressee.

**Blocked by:** 03 - Lock the comments and Friendship schema boundary.

**Status:** done

- [x] Shared Person A contract types include the exact FriendStatus, Friend, and `FriendsResponse` shapes with required `friendshipId` and direction.
- [x] Every Friendship route requires authentication and uses the shared rate limiter.
- [x] `GET /api/friends` returns only accepted Friendships involving the caller and returns the other Intern as `Friend.user`.
- [x] `GET /api/friends/requests` returns only incoming pending Friend Requests for which the caller is the addressee.
- [x] `POST /api/friends/request` rejects the caller's own ID, a missing user, and a Subletter target or caller.
- [x] A new valid request returns 200 with one canonical pending Friend, the row's `friendshipId`, the other Intern, and caller-relative direction.
- [x] Repeating a request or requesting the same pair in reverse returns the existing canonical relationship and never creates a second row.
- [x] `POST /api/friends/{id}/accept` treats `{id}` as `friendshipId`, succeeds only for the addressee of a pending request, and returns 200 with the accepted canonical Friend.
- [x] `POST /api/friends/{id}/decline` treats `{id}` as `friendshipId`, succeeds only for the addressee of a pending request, deletes the row, and returns 204 with no response body.
- [x] After a decline, either Intern can create a new pending request for the pair.
- [x] The requester cannot accept or decline the outgoing request, and a stranger cannot read or resolve it.
- [x] Direction is always computed relative to the caller and is never copied from request input.
- [x] Concurrent or repeated reverse requests remain protected by the database canonical-pair constraint.
- [x] Idempotent seed data includes at least one accepted Friendship and one incoming pending Friend Request between Interns only.
