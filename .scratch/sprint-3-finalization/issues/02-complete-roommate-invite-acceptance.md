# 02 - Complete roommate invite acceptance

**What to build:** A booker can invite an accepted friend to a live booking, the invitee can see and accept the pending invitation, and both users then see the confirmed roommate group. Fixture and live behavior follow the same pending-then-accepted lifecycle.

**Blocked by:** None - can start immediately.

**Status:** implemented

- [x] Inviting a friend creates a pending roommate invitation and does not immediately confirm that person as a roommate.
- [x] An invited user has a clear surface for viewing and accepting the invitation.
- [x] Acceptance moves the user from pending to confirmed and updates the grouped booking view for both parties.
- [x] Only accepted friends can be invited, and only the intended invitee can accept.
- [x] Roommate controls are unavailable after a booking is no longer requested or approved.
- [x] Fixture, route, state, and browser tests cover invite, pending, accept, authorization, and closed-booking behavior.
