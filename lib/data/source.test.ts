import { beforeEach, describe, expect, it, vi } from "vitest";

describe("fixture booking discovery state", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("removes a confirmed booked listing from the fresh deck", async () => {
    const source = await import("@/lib/data/source");

    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L8")).toBe(true);

    const approved = await source.approveBooking("book-priya-L8");
    expect(approved?.status).toBe("approved");
    const booked = await source.confirmBooking("book-priya-L8");

    expect(booked?.status).toBe("booked");
    expect((await source.getPerchDeck()).deck.some((p) => p.id === "L8")).toBe(false);
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
