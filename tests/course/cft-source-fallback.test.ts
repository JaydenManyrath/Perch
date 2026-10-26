/**
 * CS 7314 - CFT/WBT on the fixture|live switch in lib/data/source.ts (CFG-6 in
 * docs/testing/cft/cfg.md). The booking MUTATIONS share one shape:
 *
 *   N1 live? --no--> N5 fixture mutation
 *     |yes
 *   N2 fetch --throws--> null --> N5
 *   N3 res.ok? --no--> null --> N5        <- a 4xx REJECTION also lands here
 *   N4 usable? --no--> null --> N5
 *     |yes --> return live value
 *
 * Every edge is forced below. The spec ("degrade to the fixture when a route errors or a
 * key is missing - we never crash") covers outages; a deliberate server rejection
 * (409 already held, 403 not allowed) is not an outage and must not be turned into a
 * fabricated local success.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function configureLive() {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "live");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
}

const LIVE_ID = "11111111-2222-4333-8444-555555555555";
const liveBooking = {
  id: LIVE_ID,
  listingId: "L7",
  booker: { id: "u", name: "U", avatarUrl: null },
  pendingRoommates: [],
  roommates: [],
  status: "requested",
  createdAt: "2026-07-01T00:00:00Z",
  decidedAt: null,
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

async function load() {
  const source = await import("@/lib/data/source");
  const { bookingsFixture } = await import("@/lib/fixtures/bookings");
  return { source, bookingsFixture };
}

describe("CFG-6 requestBooking fallback edges", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("CF-30 N1 false (fixture mode): never calls the network, creates a fixture hold", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { source, bookingsFixture } = await load();
    const before = bookingsFixture.length;
    const b = await source.requestBooking("L7", {});
    expect(fetchMock).not.toHaveBeenCalled();
    expect(b.status).toBe("requested");
    expect(bookingsFixture.length).toBe(before + 1);
  });

  it("CF-31 N4 true: a usable live booking is returned and the fixture is untouched", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(201, liveBooking)));
    const { source, bookingsFixture } = await load();
    const before = bookingsFixture.length;
    expect((await source.requestBooking("L7", {})).id).toBe(LIVE_ID);
    expect(bookingsFixture.length).toBe(before);
  });

  it("CF-32 N2 throws (network outage): degrades to the fixture", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { source } = await load();
    expect((await source.requestBooking("L7", {})).status).toBe("requested");
  });

  it("CF-33 N3 false with 5xx (server error): degrades to the fixture", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, { error: "booking_request_failed" })));
    const { source } = await load();
    expect((await source.requestBooking("L7", {})).status).toBe("requested");
  });

  it("CF-34 N4 false (malformed 200 body): degrades to the fixture", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(200, { nope: true })));
    const { source } = await load();
    expect((await source.requestBooking("L7", {})).status).toBe("requested");
  });

  it("CF-35 N3 false with 409 (listing already held): the rejection reaches the caller, no phantom booking", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { error: "listing_already_held" })));
    const { source, bookingsFixture } = await load();
    const before = bookingsFixture.length;
    await expect(source.requestBooking("L7", {})).rejects.toThrow(/listing_already_held/);
    expect(bookingsFixture.length).toBe(before);
  });

  it("CF-36 N3 false with 403 (cannot book own listing): the rejection reaches the caller", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(403, { error: "cannot_book_own_listing" })));
    const { source } = await load();
    await expect(source.requestBooking("L7", {})).rejects.toThrow(/cannot_book_own_listing/);
  });
});

describe("CFG-6 owner/booker transitions fallback edges", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("CF-37 approve: live 409 (double approve) is surfaced, not silently swallowed as null", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { error: "only a requested booking can be approved" })));
    const { source } = await load();
    await expect(source.approveBooking(LIVE_ID)).rejects.toThrow(/requested booking/);
  });

  it("CF-38 confirm: live 409 is surfaced and a same-id fixture row is not flipped to booked", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(409, { error: "only an approved booking can be confirmed" })));
    const { source, bookingsFixture } = await load();
    // book-jordan-L1 is an APPROVED fixture row; a rejected live confirm must not book it locally.
    await expect(source.confirmBooking("book-jordan-L1")).rejects.toThrow();
    expect(bookingsFixture.find((b) => b.id === "book-jordan-L1")!.status).toBe("approved");
  });

  it("CF-39 decline: outage still degrades to the fixture (documented behaviour preserved)", async () => {
    configureLive();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    const { source } = await load();
    expect((await source.declineBooking("book-alex-L4"))!.status).toBe("declined");
  });
});
