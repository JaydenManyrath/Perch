import type { SupabaseClient } from "@supabase/supabase-js";
import { fetchNearbyEvents, type EventUpsert } from "@/lib/events/ticketmaster";

/**
 * Shared event-ingest core (RB51). Extracted from scripts/ingest-events.ts so the SAME
 * logic runs from three callers: the CLI script, the guarded cron route, and the
 * cooldown-gated on-request refresh. Idempotent by construction - it upserts on the
 * unique (source, external_id), so re-runs add zero rows and live rows never collide with
 * the seeded base (source='seeded'). Only LIVE Ticketmaster rows are written: when a city
 * returns the seeded fallback (no key / quota / empty), nothing is written and the seeded
 * events remain untouched. Pure of any env/schedule concern - give it a service-role
 * client and it behaves identically everywhere.
 */

export type IngestCity = { name: string; lat: number; lng: number; radiusMiles: number };

/**
 * The demo runs on Seattle. Each city adds exactly ONE Ticketmaster call per ingest, so
 * keep this list short - the rate math in maybeRefreshCity() assumes a small city count.
 */
export const INGEST_CITIES: IngestCity[] = [
  { name: "Seattle", lat: 47.6062, lng: -122.3321, radiusMiles: 25 },
];

export type CityIngestResult = {
  city: string;
  source: "ticketmaster" | "fallback";
  upserted: number; // live rows upserted (0 when the seeded fallback was used)
};

export type IngestResult = {
  cities: CityIngestResult[];
  totalUpserted: number;
};

/** Injectable fetcher (defaults to the real Ticketmaster client); lets tests stay offline. */
type FetchEvents = typeof fetchNearbyEvents;

type IngestOptions = {
  cities?: IngestCity[];
  now?: Date;
  fetchEvents?: FetchEvents;
};

/**
 * Ingest upcoming Ticketmaster events for each city into `events`. Returns a per-city
 * summary. Throws only if the database upsert itself errors; a source with no live data
 * is reported (source='fallback', upserted=0), never an error, so a missing key is a
 * no-op rather than a crash.
 */
export async function ingestEvents(db: SupabaseClient, opts: IngestOptions = {}): Promise<IngestResult> {
  const cities = opts.cities ?? INGEST_CITIES;
  const fetchEvents = opts.fetchEvents ?? fetchNearbyEvents;
  const results: CityIngestResult[] = [];
  let totalUpserted = 0;

  for (const city of cities) {
    const { events, source } = await fetchEvents({
      lat: city.lat,
      lng: city.lng,
      radiusMiles: city.radiusMiles,
      now: opts.now,
    });

    // Only persist genuine live rows. A fallback result means the seeded base already
    // covers the feed - writing it would be redundant and could shadow real rows.
    if (source !== "ticketmaster" || events.length === 0) {
      results.push({ city: city.name, source: "fallback", upserted: 0 });
      continue;
    }

    const { error } = await upsertEvents(db, events);
    if (error) throw new Error(`ingest ${city.name} failed: ${error}`);

    totalUpserted += events.length;
    results.push({ city: city.name, source: "ticketmaster", upserted: events.length });
  }

  return { cities: results, totalUpserted };
}

/** Idempotent upsert onto the unique (source, external_id). Central so every caller dedupes identically. */
async function upsertEvents(db: SupabaseClient, events: EventUpsert[]): Promise<{ error: string | null }> {
  const { error } = await db.from("events").upsert(events, { onConflict: "source,external_id" });
  return { error: error ? error.message : null };
}

// ---------------------------------------------------------------------------------------
// Cooldown-gated on-request background refresh (RB52)
//
// A once-a-day cron is not "live": between runs the table a traffic-serving route reads
// (/api/feed) could drift up to 24h stale. To keep events fresh under real traffic WITHOUT
// hammering Ticketmaster, /api/events/nearby calls maybeRefreshCity() when it serves
// events. Two guards keep it rate-safe:
//   1. Cooldown - fire at most once per REFRESH_COOLDOWN_MS (default 6h) per city.
//   2. In-flight guard - concurrent requests collapse onto ONE running refresh.
// Both live in instance memory (there is no ingestion-timestamp column to read, and this
// round adds no schema); on Vercel the ceiling is therefore per-instance.
//
// Rate math (Ticketmaster Discovery free tier: 5000 calls/day, 5 req/sec):
//   - daily cron:                      1 call / day / city
//   - on-request refresh @ 6h cooldown: <= 4 calls / day / city (24h / 6h)
//   => <= 5 calls / day / city. Even scaled to dozens of cities across a handful of warm
//      instances this stays orders of magnitude under 5000/day. For the single-city demo on
//      one Fluid Compute instance the real number is ~1-5 calls/day.
// ---------------------------------------------------------------------------------------

const DEFAULT_COOLDOWN_MS = 6 * 60 * 60 * 1000; // 6h

function cooldownMs(): number {
  const raw = Number(process.env.REFRESH_COOLDOWN_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_COOLDOWN_MS;
}

/** Bucket key: round coords so all requests for the same city share one cooldown window. */
function cityKey(city: IngestCity): string {
  return `${city.lat.toFixed(3)},${city.lng.toFixed(3)}`;
}

type RefreshState = { lastAt: number; inFlight: Promise<IngestResult> | null };
const refreshState = new Map<string, RefreshState>();

type RefreshOptions = { now?: number; fetchEvents?: FetchEvents };

/**
 * Kick a background ingest for `city` iff the cooldown has elapsed and no refresh is
 * already running. Returns the in-flight promise (the fresh one, or the one a concurrent
 * caller already started) or null when the cooldown gate is closed.
 *
 * Fire-and-forget: request handlers must NOT await the returned promise (do
 * `void maybeRefreshCity(...)`), only tests do. Never rejects into the caller - ingest
 * failures are swallowed and logged, and the cooldown is stamped at START so a failing or
 * slow upstream is not retried on every request. `makeDb` is a factory so the admin client
 * is constructed only when a refresh actually fires (closed gate does zero work).
 */
export function maybeRefreshCity(
  makeDb: () => SupabaseClient,
  city: IngestCity,
  opts: RefreshOptions = {},
): Promise<IngestResult> | null {
  const now = opts.now ?? Date.now();
  const key = cityKey(city);
  // -Infinity => a city never refreshed is always stale on first touch (cold start refreshes now).
  const state = refreshState.get(key) ?? { lastAt: Number.NEGATIVE_INFINITY, inFlight: null };

  if (state.inFlight) return state.inFlight; // one refresh at a time
  if (now - state.lastAt < cooldownMs()) return null; // still fresh -> no call

  state.lastAt = now; // stamp at start: gate stays closed even if this run fails/stalls
  refreshState.set(key, state);

  // The async wrapper turns even a synchronous makeDb()/createAdminClient() throw into a
  // rejection the .catch() below swallows, so this function never throws into the caller.
  const run = (async () =>
    ingestEvents(makeDb(), { cities: [city], now: new Date(now), fetchEvents: opts.fetchEvents }))()
    .catch((err) => {
      console.warn(`events refresh failed for ${city.name}:`, err instanceof Error ? err.message : err);
      return { cities: [], totalUpserted: 0 } as IngestResult;
    })
    .finally(() => {
      const s = refreshState.get(key);
      if (s) s.inFlight = null;
    });

  state.inFlight = run;
  return run;
}

/** Test-only: clear the in-memory cooldown + in-flight state between cases. */
export function __resetRefreshState(): void {
  refreshState.clear();
}
