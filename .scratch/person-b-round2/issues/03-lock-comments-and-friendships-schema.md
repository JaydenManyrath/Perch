# 03 - Lock the comments and Friendship schema boundary

**What to build:** Add the batch-2 database structures for located Map Comments, event comments, and canonical Friendships with default-deny authorization before any consumer route writes to them.

**Blocked by:** 02 - Lock the core Round 2 schema and authorization boundary.

**Status:** done

- [x] Notes gain nullable latitude and longitude, and city becomes nullable without changing the city value of any existing legacy note.
- [x] A database CHECK accepts either both coordinates or neither coordinate and rejects every half-coordinate insert or update.
- [x] Event comments reference an existing event and author and have the contracted body and creation timestamp fields.
- [x] Friendships reference distinct requester and addressee Interns and accept only pending or accepted status.
- [x] A database constraint or unique index gives each unordered pair of Interns one canonical Friendship regardless of request direction.
- [x] Indexes cover located-note viewport queries, event comment lookup, Friendship participant lookup, status lookup, and incoming request lookup.
- [x] RLS is enabled and forced for every new table and remains forced for the altered notes table.
- [x] Authenticated users may read comments, but only an Intern author may insert or mutate their own Map Comment or event comment.
- [x] A Subletter cannot author Map Comments, event comments, or Friendships through direct database writes.
- [x] Only the two Friendship participants can read a Friendship row.
- [x] Only the addressee can accept or delete a pending Friend Request; the requester and a stranger cannot resolve it directly.
- [x] Direct writes reject self-Friendships, a Subletter in either participant position, and a reverse-direction duplicate.
- [x] Existing legacy notes, events, and Round 1 RLS tests remain green after the migration.
