# 07 - Let Subletters post and confirm listings safely

**What to build:** Let a Subletter publish a complete listing and later confirm it is still available while keeping ownership, Listing Provenance, and freshness exclusively under server control.

**Blocked by:** 06 - Deliver the fresh Perch deck, swipes, and Saved Perches.

**Status:** done

- [x] Shared Person A contract types include the exact `PostListingInput` and `{ listing: PerchCard }` response wrapper.
- [x] `POST /api/listings` requires authentication, is rate-limited, accepts only the frozen input fields, and rejects incomplete or invalid listing content.
- [x] Only a Subletter can post; an Intern receives a forbidden response and no row is created.
- [x] A successful post returns 201 and an authoritative enriched PerchCard rather than echoing untrusted request data.
- [x] The server sets `created_by` from the session, `sourced = false`, `source_name = "subletter"`, `status = "available"`, and a future initial expiry.
- [x] Request fields that attempt to set ownership, provenance, status, expiry, or confirmation metadata are rejected or ignored and cannot affect the stored row.
- [x] `POST /api/listings/{id}/confirm` is rate-limited and succeeds only for the owning Subletter.
- [x] Confirmation sets the status to available, sets `last_confirmed_at` to the server time, advances expiry by the documented demo freshness window, and returns 200 with the current enriched PerchCard.
- [x] An Intern, another Subletter, and the owner of an auto-sourced row cannot confirm that listing.
- [x] Direct authenticated attempts to change each protected field remain rejected, while the owning Subletter can edit user-authored content through the allowed database path.
- [x] No user-facing listing-status endpoint, expiry job, sourcing adapter, or ping dispatcher is introduced by this ticket.
