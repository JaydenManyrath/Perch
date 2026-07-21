import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ingestEvents, maybeRefreshCity, __resetRefreshState, PRUNE_GRACE_MS, type IngestCity } from "./ingest";
import type { EventUpsert } from "./ticketmaster";

const CITY: IngestCity = { name: "Seattle", lat: 47.6062, lng: -122.3321, radiusMiles: 25 };
const HOUR = 60 * 60 * 1000;
// Fixed clock for every ingest call: prune compares datetimes to `now`, so letting the
// real clock in would make these tests decay as dates pass. All fixture datetimes below
// are chosen relative to this instant.
const NOW = new Date("2026-08-02T12:00:00Z");

function tmRow(id: string, datetime = "2026-08-03T20:00:00Z"): EventUpsert {
  return {
    id: `00000000-0000-0000-0000-${id.padStart(12, "0")}`,
    external_id: id,
    source: "ticketmaster",
    title: `Event ${id}`,
    category: "music",
    lat: 47.6,
    lng: -122.3,
    datetime,
    url: null,
    venue: null,
    image_url: null,
    price_range: null,
  };
}

function seededRow(id: string, datetime: string): EventUpsert {
  return { ...tmRow(id, datetime), source: "seeded" };
}

type DeleteCall = { count?: string; filters: { method: string; args: [string, string] }[] };

/** A fake service-role client that models the unique (source, external_id) constraint and
 * a filterable delete (eq/lt applied to the row store the way Postgres would). */
function fakeDb(initialRows: EventUpsert[] = []) {
  const rows = new Map<string, EventUpsert>();
  for (const r of initialRows) rows.set(`${r.source}:${r.external_id}`, r);
  const upsert = vi.fn(async (batch: EventUpsert[], opts: { onConflict?: string }) => {
    for (const r of batch) rows.set(`${r.source}:${r.external_id}`, r);
    return { error: null, _onConflict: opts?.onConflict };
  });
  const deletes: DeleteCall[] = [];
  const del = vi.fn((opts?: { count?: string }) => {
    const call: DeleteCall = { count: opts?.count, filters: [] };
    deletes.push(call);
    const builder = {
      eq(column: string, value: string) {
        call.filters.push({ method: "eq", args: [column, value] });
        return builder;
      },
      lt(column: string, value: string) {
        call.filters.push({ method: "lt", args: [column, value] });
        return builder;
      },
      then(resolve: (value: { count: number; error: null }) => unknown) {
        let removed = 0;
        for (const [key, row] of [...rows]) {
          const matches = call.filters.every(({ method, args: [column, value] }) => {
            const cell = row[column as keyof EventUpsert];
            if (method === "eq") return cell === value;
            // Timestamps compare chronologically, like a Postgres timestamptz column.
            return Date.parse(String(cell)) < Date.parse(value);
          });
          if (matches) {
            rows.delete(key);
            removed += 1;
          }
        }
        return Promise.resolve({ count: removed, error: null }).then(resolve);
      },
    };
    return builder;
  });
  const from = vi.fn((table: string) => {
    if (table !== "events") throw new Error(`unexpected table ${table}`);
    return { upsert, delete: del };
  });
  return { db: { from } as unknown as SupabaseClient, rows, upsert, deletes, from };
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

    const result = await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });

    expect(result.totalUpserted).toBe(2);
    expect(result.cities).toEqual([{ city: "Seattle", source: "ticketmaster", upserted: 2, pruned: 0 }]);
    expect(upsert).toHaveBeenCalledTimes(1);
    // PK conflict target: the partial (source, external_id) index cannot be used by
    // PostgREST on_conflict, so rows carry a deterministic id instead.
    expect(upsert.mock.calls[0][1]).toEqual({ onConflict: "id" });
  });

  it("is idempotent: a re-run adds zero rows", async () => {
    const { db, rows } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("a"), tmRow("b")], source: "ticketmaster" });

    await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });
    expect(rows.size).toBe(2);
    await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });
    expect(rows.size).toBe(2); // same keys upserted, no duplicates
  });

  it("writes nothing when a city returns the seeded fallback", async () => {
    const { db, upsert } = fakeDb();
    const fetchEvents = fetcher({ events: [tmRow("seed")], source: "fallback" });

    const result = await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });

    expect(upsert).not.toHaveBeenCalled();
    expect(result.totalUpserted).toBe(0);
    expect(result.cities).toEqual([{ city: "Seattle", source: "fallback", upserted: 0, pruned: 0 }]);
  });

  it("throws when the database upsert errors", async () => {
    const from = vi.fn(() => ({ upsert: vi.fn(async () => ({ error: { message: "boom" } })) }));
    const db = { from } as unknown as SupabaseClient;
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });

    await expect(ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents })).rejects.toThrow(/ingest Seattle failed: boom/);
  });
});

describe("ingestEvents prune (round 7 self-cleaning)", () => {
  const passedIso = new Date(NOW.getTime() - PRUNE_GRACE_MS - HOUR).toISOString(); // 7h ago: prune
  const inGraceIso = new Date(NOW.getTime() - 3 * HOUR).toISOString(); // started 3h ago: keep
  const cutoffIso = new Date(NOW.getTime() - PRUNE_GRACE_MS).toISOString();

  it("prunes passed live rows from a mixed batch with the exact filter, sparing the grace window", async () => {
    const { db, rows, deletes } = fakeDb();
    const batch = [tmRow("passed", passedIso), tmRow("ingrace", inGraceIso), tmRow("future")];
    const fetchEvents = fetcher({ events: batch, source: "ticketmaster" });

    const result = await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });

    // Exactly one delete, scoped source='ticketmaster' AND datetime < now - 6h.
    expect(deletes).toHaveLength(1);
    expect(deletes[0].count).toBe("exact");
    expect(deletes[0].filters).toEqual([
      { method: "eq", args: ["source", "ticketmaster"] },
      { method: "lt", args: ["datetime", cutoffIso] },
    ]);
    // The long-passed row is gone; the just-started and future rows survive.
    expect([...rows.keys()].sort()).toEqual(["ticketmaster:future", "ticketmaster:ingrace"]);
    expect(result.cities).toEqual([{ city: "Seattle", source: "ticketmaster", upserted: 3, pruned: 1 }]);
    expect(result.totalPruned).toBe(1);
  });

  it("prunes on a fallback pass too, and never deletes seeded rows however old", async () => {
    const stale = [tmRow("stale-live", passedIso), seededRow("old-seed", "2026-07-01T00:00:00Z")];
    const { db, rows, upsert, deletes } = fakeDb(stale);
    const fetchEvents = fetcher({ events: [tmRow("ignored")], source: "fallback" });

    const result = await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });

    expect(upsert).not.toHaveBeenCalled(); // fallback still writes nothing
    expect(deletes).toHaveLength(1); // but the pass still self-cleans
    expect([...rows.keys()]).toEqual(["seeded:old-seed"]); // seeded base untouched
    expect(result.cities).toEqual([{ city: "Seattle", source: "fallback", upserted: 0, pruned: 1 }]);
    expect(result.totalPruned).toBe(1);
  });

  it("treats a prune failure as non-fatal: logs, reports 0, keeps the upsert result", async () => {
    const upsert = vi.fn(async () => ({ error: null }));
    const failingDelete = vi.fn(() => {
      const builder = {
        eq: () => builder,
        lt: () => builder,
        then: (resolve: (value: { count: null; error: { message: string } }) => unknown) =>
          Promise.resolve({ count: null, error: { message: "prune boom" } }).then(resolve),
      };
      return builder;
    });
    const db = { from: vi.fn(() => ({ upsert, delete: failingDelete })) } as unknown as SupabaseClient;
    const fetchEvents = fetcher({ events: [tmRow("a")], source: "ticketmaster" });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await ingestEvents(db, { cities: [CITY], now: NOW, fetchEvents });

    expect(result.cities).toEqual([{ city: "Seattle", source: "ticketmaster", upserted: 1, pruned: 0 }]);
    expect(result.totalPruned).toBe(0);
    expect(warn).toHaveBeenCalledWith("events prune failed:", "prune boom");
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
    await expect(failing).resolves.toEqual({ cities: [], totalUpserted: 0, totalPruned: 0 }); // resolves, never rejects

    const again = maybeRefreshCity(() => db, CITY, { now: 1_000_000 + HOUR, fetchEvents });
    expect(again).toBeNull(); // a failed run still stamps the cooldown
  });
});
