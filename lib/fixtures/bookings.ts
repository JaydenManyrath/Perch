import type { Booking } from "@/lib/types/contract";
import { ME_ID, meFixture, otherUsersFixture } from "./users";

/**
 * Round 3 (section 13.4) - seed bookings.
 * Mutable in-memory array so the client-side data-source can create/update
 * bookings and have the UI reflect them without a real backend.
 */

const jordan = otherUsersFixture[0];
const priya = otherUsersFixture[3];

export const bookingsFixture: Booking[] = [
  // Me: I've requested to book L4 (the Ballard cottage) but no decision yet.
  {
    id: "book-alex-L4",
    listingId: "L4",
    booker: {
      id: ME_ID,
      name: "Alex Chen",
      avatarUrl: `https://api.dicebear.com/9.x/thumbs/svg?seed=alex&backgroundColor=BFE3F7`,
    },
    pendingRoommates: [],
    roommates: [],
    status: "requested",
    createdAt: "2026-06-06T18:00:00Z",
    decidedAt: null,
  },
  // Jordan has an approved booking on visible saved listing L1 and invited me, so the fixture demo
  // can drive the pending -> accepted roommate lifecycle in the browser.
  {
    id: "book-jordan-L1",
    listingId: "L1",
    booker: {
      id: jordan.id,
      name: jordan.name,
      avatarUrl: jordan.avatar_url,
    },
    pendingRoommates: [
      { id: ME_ID, name: meFixture.name, avatarUrl: meFixture.avatar_url },
    ],
    roommates: [],
    status: "approved",
    createdAt: "2026-06-04T12:00:00Z",
    decidedAt: "2026-06-05T09:00:00Z",
  },
  // Priya requested L8; still awaiting approval.
  {
    id: "book-priya-L8",
    listingId: "L8",
    booker: {
      id: priya.id,
      name: priya.name,
      avatarUrl: priya.avatar_url,
    },
    pendingRoommates: [],
    roommates: [],
    status: "requested",
    createdAt: "2026-06-05T14:00:00Z",
    decidedAt: null,
  },
];
