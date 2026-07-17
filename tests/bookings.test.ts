import { describe, it, expect } from "vitest";
import {
  transitionBooking,
  parseBookRequest,
  parseRoommateInvite,
  BookingInputError,
  BookingForbiddenError,
  BookingConflictError,
  bookingErrorStatus,
} from "@/lib/bookings";

const U = "11111111-1111-5111-8111-111111111111";
const V = "22222222-2222-5222-8222-222222222222";

describe("transitionBooking - deterministic state machine", () => {
  it("owner approves a requested booking", () => {
    expect(transitionBooking("requested", "approve", "owner")).toEqual({
      status: "approved",
      setListingTaken: false,
      releaseListing: false,
    });
  });

  it("booker confirms an approved booking and the listing is taken", () => {
    expect(transitionBooking("approved", "confirm", "booker")).toEqual({
      status: "booked",
      setListingTaken: true,
      releaseListing: false,
    });
  });

  it("owner declines and releases the hold", () => {
    expect(transitionBooking("requested", "decline", "owner").status).toBe("declined");
    expect(transitionBooking("approved", "decline", "owner").releaseListing).toBe(true);
  });

  it("booker cancels a live booking", () => {
    expect(transitionBooking("booked", "cancel", "booker")).toEqual({
      status: "cancelled",
      setListingTaken: false,
      releaseListing: true,
    });
  });

  it("rejects a non-owner approving", () => {
    expect(() => transitionBooking("requested", "approve", "booker")).toThrow(BookingForbiddenError);
    expect(() => transitionBooking("requested", "approve", "other")).toThrow(BookingForbiddenError);
  });

  it("rejects a non-booker confirming", () => {
    expect(() => transitionBooking("approved", "confirm", "owner")).toThrow(BookingForbiddenError);
    expect(() => transitionBooking("approved", "confirm", "roommate")).toThrow(BookingForbiddenError);
  });

  it("rejects confirming a booking that is not approved", () => {
    expect(() => transitionBooking("requested", "confirm", "booker")).toThrow(BookingConflictError);
    expect(() => transitionBooking("booked", "confirm", "booker")).toThrow(BookingConflictError);
  });

  it("rejects approving something already approved (no double-approve)", () => {
    expect(() => transitionBooking("approved", "approve", "owner")).toThrow(BookingConflictError);
  });

  it("is a pure function (same inputs -> same output)", () => {
    const a = transitionBooking("approved", "confirm", "booker");
    const b = transitionBooking("approved", "confirm", "booker");
    expect(a).toEqual(b);
  });
});

describe("parseBookRequest", () => {
  it("defaults to no roommates", () => {
    expect(parseBookRequest(undefined)).toEqual({ roommateIds: [] });
    expect(parseBookRequest({})).toEqual({ roommateIds: [] });
  });
  it("dedupes valid roommate ids", () => {
    expect(parseBookRequest({ roommateIds: [U, U, V] })).toEqual({ roommateIds: [U, V] });
  });
  it("rejects non-uuid roommate ids", () => {
    expect(() => parseBookRequest({ roommateIds: ["nope"] })).toThrow(BookingInputError);
  });
  it("rejects unexpected fields", () => {
    expect(() => parseBookRequest({ roommateIds: [U], extra: 1 })).toThrow(BookingInputError);
  });
});

describe("parseRoommateInvite", () => {
  it("requires a valid userId", () => {
    expect(parseRoommateInvite({ userId: U })).toEqual({ userId: U });
    expect(() => parseRoommateInvite({ userId: "x" })).toThrow(BookingInputError);
    expect(() => parseRoommateInvite({})).toThrow(BookingInputError);
  });
});

describe("bookingErrorStatus", () => {
  it("maps known errors to HTTP statuses", () => {
    expect(bookingErrorStatus(new BookingInputError("x"))?.status).toBe(400);
    expect(bookingErrorStatus(new BookingForbiddenError("x"))?.status).toBe(403);
    expect(bookingErrorStatus(new BookingConflictError("x"))?.status).toBe(409);
    expect(bookingErrorStatus(new Error("x"))).toBeNull();
  });
});
