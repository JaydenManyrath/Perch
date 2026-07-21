import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventRow } from "@/lib/types/contract";

/**
 * Round 7 - upcoming-only guard on the MAP events path. Map event pins come from
 * app/(shell)/map/page.tsx -> lib/data/server-source.getEvents -> lib/data/source.getEvents,
 * which must filter datetime >= now IN-QUERY (not client-side) so a passed event can never
 * reach the map even if a stale row is still in the table. The mock below behaves like
 * Postgres: it applies whatever gte() filter the query actually sent - so if the guard is
 * ever dropped, the past event comes back and this test fails.
 */

function configureLive() {
  vi.stubEnv("NEXT_PUBLIC_DATA_SOURCE", "live");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-anon-key");
}

function eventRow(id: string, datetime: string): EventRow {
  return {
    id,
    title: `Event ${id}`,
    category: "music",
    lat: 47.6,
    lng: -122.33,
    datetime,
    source: "ticketmaster",
    external_id: `tm-${id}`,
    url: null,
    venue: null,
    image_url: null,
    price_range: null,
  };
}

describe("map events path (source.getEvents) upcoming-only guard", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("excludes a past event in-query and keeps the upcoming one", async () => {
    configureLive();
    const testStart = Date.now();
    // Relative to the real clock, matching getEvents' own new Date() - never decays.
    const pastEvent = eventRow("past", new Date(testStart - 24 * 60 * 60 * 1000).toISOString());
    const futureEvent = eventRow("future", new Date(testStart + 24 * 60 * 60 * 1000).toISOString());
    const table = [pastEvent, futureEvent];

    const query = {
      gteArgs: null as [string, string] | null,
      select: vi.fn(),
      gte: vi.fn(),
      order: vi.fn(),
    };
    query.select.mockReturnValue(query);
    query.gte.mockImplementation((column: string, value: string) => {
      query.gteArgs = [column, value];
      return query;
    });
    query.order.mockImplementation(async () => {
      // Postgres-like: apply only the filter the query actually carried. No gte recorded
      // (guard regressed) => both rows return and the past event surfaces.
      const [column, cutoff] = query.gteArgs ?? ["datetime", "1970-01-01T00:00:00.000Z"];
      const data = table
        .filter((row) => Date.parse(String(row[column as keyof EventRow])) >= Date.parse(cutoff))
        .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));
      return { data, error: null };
    });
    const supabase = { from: vi.fn().mockReturnValue(query) };

    const source = await import("@/lib/data/source");
    const events = await source.getEvents({ supabase: supabase as never, fetch: vi.fn() as never });

    // The guard really is in-query: datetime >= <now-ish ISO>, sent to the database.
    expect(query.gte).toHaveBeenCalledTimes(1);
    expect(query.gteArgs?.[0]).toBe("datetime");
    expect(Date.parse(String(query.gteArgs?.[1]))).toBeGreaterThanOrEqual(testStart - 1000);
    expect(Date.parse(String(query.gteArgs?.[1]))).toBeLessThanOrEqual(Date.now() + 1000);

    // And the past event never reaches the map.
    expect(events.map((event) => event.id)).toEqual(["future"]);
    expect(supabase.from).toHaveBeenCalledWith("events");
  });
});
