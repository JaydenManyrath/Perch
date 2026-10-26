/**
 * CS 7314 - FSM/BBT, implementation under test #2: the FIXTURE data source.
 *
 * With no live keys (the default demo mode) every booking action is served by the
 * in-memory fixture in lib/data/source.ts. The same model applies: the fixture must
 * accept exactly the valid transitions and leave state unchanged on invalid ones.
 * Role-based sneak paths (I01, I14-I16) do not apply here because the fixture has a
 * single actor; cancel and expire have no fixture implementation and are N/A.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  approveBooking,
  confirmBooking,
  confirmListing,
  declineBooking,
  getPerchDeck,
  requestBooking,
} from "@/lib/data/source";
import { bookingsFixture } from "@/lib/fixtures/bookings";
import { listingsFixture } from "@/lib/fixtures/listings";
import { LISTING_FRESHNESS_DAYS } from "@/lib/perches";
import type { Booking } from "@/lib/types/contract";

const BASE_BOOKINGS = structuredClone(bookingsFixture);
const BASE_LISTINGS = structuredClone(listingsFixture);

const L = "L7"; // available, no seeded bookings
const STALE_L = "L9"; // seeded stale

function listing(id = L) {
  return listingsFixture.find((l) => l.id === id)!;
}

async function toRequested(): Promise<Booking> {
  return requestBooking(L, {});
}
async function toApproved(): Promise<Booking> {
  const b = await toRequested();
  return (await approveBooking(b.id))!;
}
async function toBooked(): Promise<Booking> {
  const b = await toApproved();
  return (await confirmBooking(b.id))!;
}
async function toDeclined(): Promise<Booking> {
  const b = await toRequested();
  return (await declineBooking(b.id))!;
}

beforeEach(() => {
  bookingsFixture.splice(0, bookingsFixture.length, ...structuredClone(BASE_BOOKINGS));
  listingsFixture.splice(0, listingsFixture.length, ...structuredClone(BASE_LISTINGS));
});

describe("FSM booking model - fixture source - valid transitions", () => {
  it("T01: S0 --request--> S1", async () => {
    const b = await toRequested();
    expect(b.status).toBe("requested");
    expect(listing().status).toBe("available");
  });
  it("T02: S1 --approve--> S2", async () => {
    expect((await toApproved()).status).toBe("approved");
  });
  it("T03: S1 --decline--> S4", async () => {
    expect((await toDeclined()).status).toBe("declined");
  });
  it("T04: S2 --decline--> S4", async () => {
    const b = await toApproved();
    expect((await declineBooking(b.id))!.status).toBe("declined");
  });
  it("T05: S2 --confirm--> S3 and the listing leaves the deck", async () => {
    const b = await toBooked();
    expect(b.status).toBe("booked");
    expect(listing().status).toBe("taken");
    const { deck } = await getPerchDeck();
    expect(deck.some((c) => c.id === L)).toBe(false);
  });
  it("T09: S4 --request--> S1 (new booking)", async () => {
    await toDeclined();
    const again = await requestBooking(L, {});
    expect(again.status).toBe("requested");
  });
  it("T12: S6 --relist--> S0 with the standard freshness window", async () => {
    const before = Date.now();
    await confirmListing(STALE_L);
    expect(listing(STALE_L).status).toBe("available");
    const days = (Date.parse(listing(STALE_L).expires_at as string) - before) / 86_400_000;
    expect(Math.round(days)).toBe(LISTING_FRESHNESS_DAYS);
  });
});

describe("FSM booking model - fixture source - invalid transitions leave state unchanged", () => {
  it("I02: S1 --confirm--> rejected", async () => {
    const b = await toRequested();
    expect((await confirmBooking(b.id))!.status).toBe("requested");
    expect(listing().status).toBe("available");
  });
  it("I03: S2 --approve--> no change", async () => {
    const b = await toApproved();
    expect((await approveBooking(b.id))!.status).toBe("approved");
  });
  it("I04: S3 --approve--> rejected", async () => {
    const b = await toBooked();
    expect((await approveBooking(b.id))!.status).toBe("booked");
  });
  it("I05: S3 --decline--> rejected (listing must not stay taken under a declined booking)", async () => {
    const b = await toBooked();
    expect((await declineBooking(b.id))!.status).toBe("booked");
    expect(listing().status).toBe("taken");
  });
  it("I06: S3 --confirm--> no change", async () => {
    const b = await toBooked();
    expect((await confirmBooking(b.id))!.status).toBe("booked");
  });
  it("I07: S4 --approve--> rejected", async () => {
    const b = await toDeclined();
    expect((await approveBooking(b.id))!.status).toBe("declined");
  });
  it("I08: S4 --confirm--> rejected", async () => {
    const b = await toDeclined();
    expect((await confirmBooking(b.id))!.status).toBe("declined");
    expect(listing().status).toBe("available");
  });
  it("I09: S1 --second request--> rejected (one live hold per listing)", async () => {
    await toRequested();
    await expect(requestBooking(L, {})).rejects.toThrow();
    const live = bookingsFixture.filter(
      (b) => b.listingId === L && ["requested", "approved", "booked"].includes(b.status),
    );
    expect(live).toHaveLength(1);
  });
  it("I11: S3 --request--> rejected (taken listing)", async () => {
    await toBooked();
    await expect(requestBooking(L, {})).rejects.toThrow();
  });
  it("I12: S6 --request--> rejected (stale listing)", async () => {
    await expect(requestBooking(STALE_L, {})).rejects.toThrow();
  });
  it("I13: S3 --relist--> rejected (a taken listing must not resurface)", async () => {
    await toBooked();
    await confirmListing(L).catch(() => undefined);
    expect(listing().status).toBe("taken");
  });
  it("I18: S4 --decline--> no change", async () => {
    const b = await toDeclined();
    expect((await declineBooking(b.id))!.status).toBe("declined");
  });
});
