import { beforeEach, describe, expect, it, vi } from "vitest";

describe("fixture booking discovery state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("removes a confirmed booked listing from the fresh deck", async () => {
    const source = await import("@/lib/data/source");

    // L8 is held by another intern (Priya), so it is already hidden (D16); use a listing
    // the viewer books themselves to check that a confirmed booking leaves the deck.
    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L8")).toBe(false);
    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L7")).toBe(true);

    const requested = await source.requestBooking("L7", {});
    const approved = await source.approveBooking(requested.id);
    expect(approved?.status).toBe("approved");
    const booked = await source.confirmBooking(requested.id);

    expect(booked?.status).toBe("booked");
    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L7")).toBe(false);
  });

  it("keeps declined bookings discoverable", async () => {
    const source = await import("@/lib/data/source");

    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L5")).toBe(true);

    const requested = await source.requestBooking("L5", {});
    const declined = await source.declineBooking(requested.id);

    expect(declined?.status).toBe("declined");
    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L5")).toBe(true);
  });
});
