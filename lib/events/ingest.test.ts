import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ingestEvents, maybeRefreshCity, __resetRefreshState, type IngestCity } from "./ingest";
import type { EventUpsert } from "./ticketmaster";

const CITY: IngestCity = { name: "Seattle", lat: 47.6062, lng: -122.3321, radiusMiles: 25 };
const HOUR = 60 * 60 * 1000;

function tmRow(id: string): EventUpsert {
  return {
    id: `00000000-0000-0000-0000-${id.padStart(12, "0")}`,
    external_id: id,
    source: "ticketmaster",
    title: `Event ${id}`,
    category: "music",
    lat: 47.6,
    lng: -122.3,
    datetime: "2026-08-01T20:00:00Z",
    url: null,
    venue: null,
    image_url: null,
    price_range: null,
  };
}

/** A fake service-role client that models the unique (source, external_id) constraint. */
function fakeDb() {
  const rows = new Map<string, EventUpsert>();
  const upsert = vi.fn(async (batch: EventUpsert[], opts: { onConflict?: string }) => {
    for (const r of batch) rows.set(`${r.source}:${r.external_id}`, r);
    return { error: null, _onConflict: opts?.onConflict };
  });
  const from = vi.fn((table: string) => {
    if (table !== "events") throw new Error(`unexpected table ${table}`);
    return { upsert };
  });
  return { db: { from } as unknown as SupabaseClient, rows, upsert, from };
}

/** A fetcher stub with a call counter, standing in for the real Ticketmaster client. */
function fetcher(result: { events: EventUpsert[]; source: "ticketmaster" | "fallback" }) {
  const fn = vi.fn(async () => result);
  return fn as unknown as typeof import("./ticketmaster").fetchNearbyEvents & { mock: (typeof fn)["mock"] };
}

beforeEach(() => {
  __resetRefreshState();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ingestEvents", () => {
  it("upserts live rows keyed on the deterministic PK id", async () => {
    const { db, upsert } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a"), tmRow("b")], source: "ticketmaster" });

    const result = await ingestEvents(db, { cities: [CITY], fetchEvents });

    expect(result.totalUpserted).toBe(2);
    expect(result.cities).toEqual([{ city: "Seattle", source: "ticketmaster", upserted: 2 }]);
    expect(upsert).toHaveBeenCalledTimes(1);
    // PK conflict target: the partial (source, external_id) index cannot be used by
    // PostgREST on_conflict, so rows carry a deterministic id instead.
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });

  it("is idempotent: a re-run adds zero rows", async () => {
    const { db, rows } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a"), tmRow("b")], source: "ticketmaster" });

    await ingestEvents(db, { cities: [CITY], fetchEvents });
    expect(rows.size).toBe(2);
    await ingestEvents(db, { cities: [CITY], fetchEvents });
    expect(rows.size).toBe(2); // same keys upserted, no duplicates
  });

  it("writes nothing when a city returns the seeded fallback", async () => {
    const { db, upsert } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("seed")], source: "fallback" });

    const result = await ingestEvents(db, { cities: [CITY], fetchEvents });

    expect(upsert).not.toHaveBeenCalled();
    expect(result.totalUpserted).toBe(0);
    expect(result.cities).toEqual([{ city: "Seattle", source: "fallback", upserted: 0 }]);
  });

  it("throws when the database upsert errors", async () => {
    const from = vi.fn(() => ({ upsert: vi.fn(async () => ({ error: { message: "boom" } })) }));
    const db = { from } as unknown as SupabaseClient;
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });

    await expect(ingestEvents(db, { cities: [CITY], fetchEvents })).rejects.toThrow(/ingest Seattle failed: boom/);
  });
});

describe("maybeRefreshCity cooldown gate", () => {
  it("fires once for a stale city and collapses concurrent callers onto one refresh", async () => {
    const { db, upsert } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });

    const p1 = maybeRefreshCity(() => db, CITY, { now: 1_000_000, fetchEvents });
    const p2 = maybeRefreshCity(() => db, CITY, { now: 1_000_000, fetchEvents });

    expect(p1).not.toBeNull();
    expect(p2).toBe(p1); // same in-flight promise, not a second refresh
    await p1;

    expect(fetchEvents).toHaveBeenCalledTimes(1);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("does not call again while still inside the cooldown window", async () => {
    const { db } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });

    await maybeRefreshCity(() => db, CITY, { now: 1_000_000, fetchEvents });
    const again = maybeRefreshCity(() => db, CITY, { now: 1_000_000 + HOUR, fetchEvents }); // 1h < 6h

    expect(again).toBeNull();
    expect(fetchEvents).toHaveBeenCalledTimes(1);
  });

  it("fires again once the cooldown has elapsed", async () => {
    const { db } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });

    await maybeRefreshCity(() => db, CITY, { now: 1_000_000, fetchEvents });
    const later = maybeRefreshCity(() => db, CITY, { now: 1_000_000 + 6 * HOUR + 1, fetchEvents });

    expect(later).not.toBeNull();
    await later;
    expect(fetchEvents).toHaveBeenCalledTimes(2);
  });

  it("swallows refresh failures and keeps the cooldown closed (no retry storm)", async () => {
    const from = vi.fn(() => ({ upsert: vi.fn(async () => ({ error: { message: "boom" } })) }));
    const db = { from } as unknown as SupabaseClient;
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const failing = maybeRefreshCity(() => db, CITY, { now: 1_000_000, fetchEvents });
    await expect(failing).resolves.toEqual({ cities: [], totalUpserted: 0 }); // resolves, never rejects

    const again = maybeRefreshCity(() => db, CITY, { now: 1_000_000 + HOUR, fetchEvents });
    expect(again).toBeNull(); // a failed run still stamps the cooldown
  });
});
