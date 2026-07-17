# 03 - Remove booked listings from active discovery

**What to build:** When a booker confirms an approved booking, the listing immediately becomes taken and disappears from active discovery surfaces without requiring a page reload.

**Blocked by:** None - can start immediately.

**Status:** implemented

- [x] The request, owner approval, and booker confirmation flow reaches the booked state in fixture and live modes.
- [x] Confirmation marks the listing taken and removes it from the active Stories deck immediately.
- [x] Refreshing or revisiting discovery does not surface the taken listing as available.
- [x] Declined or cancelled bookings do not incorrectly remove an available listing.
- [x] Integration and real-browser tests prove the listing leaves the deck after confirmation and remains absent after refresh.
