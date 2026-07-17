import { beforeEach, describe, expect, it } from "vitest";
import { acceptRoommateInvite, getBookings, inviteRoommate, requestBooking } from "@/lib/data/source";
import { bookingsFixture } from "@/lib/fixtures/bookings";
import { ME_ID, meFixture, otherUsersFixture } from "@/lib/fixtures/users";

const BASE_BOOKING_COUNT = bookingsFixture.length;

function resetFixtureBookings() {
  bookingsFixture.splice(BASE_BOOKING_COUNT);
  const alexBooking = bookingsFixture.find((b) => b.id === "book-alex-L4");
  if (alexBooking) {
    alexBooking.status = "requested";
    alexBooking.pendingRoommates = [];
    alexBooking.roommates = [];
    alexBooking.decidedAt = null;
  }
}

describe("fixture booking roommate lifecycle", () => {
  beforeEach(() => {
    resetFixtureBookings();
  });

  it("requesting with roommates creates pending invites, not confirmed roommates", async () => {
    const jordan = otherUsersFixture[0];

    const booking = await requestBooking("L7", { roommateIds: [jordan.id] });

    expect(booking.pendingRoommates).toEqual([
      { id: jordan.id, name: jordan.name, avatarUrl: jordan.avatar_url },
    ]);
    expect(booking.roommates).toEqual([]);
  });

  it("inviting a friend adds a pending roommate once", async () => {
    const jordan = otherUsersFixture[0];

    const invited = await inviteRoommate("book-alex-L4", jordan.id);
    const invitedAgain = await inviteRoommate("book-alex-L4", jordan.id);

    expect(invited?.roommates).toEqual([]);
    expect(invitedAgain?.pendingRoommates).toHaveLength(1);
    expect(invitedAgain?.pendingRoommates[0]).toMatchObject({ id: jordan.id, name: jordan.name });
  });

  it("does not invite non-accepted friends or invite after the booking is closed", async () => {
    const pendingFriend = otherUsersFixture[2];
    const jordan = otherUsersFixture[0];
    const booking = bookingsFixture.find((b) => b.id === "book-alex-L4")!;

    await inviteRoommate(booking.id, pendingFriend.id);
    booking.status = "booked";
    await inviteRoommate(booking.id, jordan.id);

    expect(booking.pendingRoommates).toEqual([]);
    expect(booking.roommates).toEqual([]);
  });

  it("acceptance moves the current user from pending to confirmed", async () => {
    const booker = otherUsersFixture[0];
    const booking = {
      id: "book-jordan-L7",
      listingId: "L7",
      booker: { id: booker.id, name: booker.name, avatarUrl: booker.avatar_url },
      pendingRoommates: [{ id: ME_ID, name: meFixture.name, avatarUrl: meFixture.avatar_url }],
      roommates: [],
      status: "requested" as const,
      createdAt: "2026-07-17T00:00:00.000Z",
      decidedAt: null,
    };
    bookingsFixture.unshift(booking);
    const before = await getBookings(ME_ID);

    const accepted = await acceptRoommateInvite(booking.id);

    expect(before.mine.some((b) => b.id === booking.id)).toBe(true);
    expect(accepted?.pendingRoommates).toEqual([]);
    expect(accepted?.roommates).toEqual([
      { id: ME_ID, name: meFixture.name, avatarUrl: meFixture.avatar_url },
    ]);
  });

  it("does not accept pending invites after the booking is closed", async () => {
    const booker = otherUsersFixture[0];
    const booking = {
      id: "book-jordan-closed-L7",
      listingId: "L7",
      booker: { id: booker.id, name: booker.name, avatarUrl: booker.avatar_url },
      pendingRoommates: [{ id: ME_ID, name: meFixture.name, avatarUrl: meFixture.avatar_url }],
      roommates: [],
      status: "booked" as const,
      createdAt: "2026-07-17T00:00:00.000Z",
      decidedAt: "2026-07-17T01:00:00.000Z",
    };
    bookingsFixture.unshift(booking);

    const unchanged = await acceptRoommateInvite(booking.id);

    expect(unchanged?.pendingRoommates).toHaveLength(1);
    expect(unchanged?.roommates).toEqual([]);
  });
});
