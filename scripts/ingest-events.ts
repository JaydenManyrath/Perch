/**
 * Live event ingestion (RC3 wiring). Pulls real upcoming Ticketmaster events into the
 * `events` table so the Flyway feed shows ACTUAL events alongside the seeded base.
 *
 * Rate-limit conscious by design: this is meant to run on a SCHEDULE (the daily seed
 * GitHub Action), not per page-load - so it makes at most a small, fixed number of
 * Ticketmaster calls per day (one per city below), nowhere near the Discovery API's
 * free-tier limits. Idempotent: upserts on the unique (source, external_id), so real
 * events never duplicate and never collide with the seeded rows (source='seed').
 *
 * Skips cleanly with no error when TICKETMASTER_API_KEY is absent (the seeded events
 * remain), so it is safe to always run in the pipeline.
 *
 * Run:  npm run ingest:events   (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *                                and TICKETMASTER_API_KEY for live data)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { fetchNearbyEvents } from "../lib/events/ticketmaster";

config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("ingest:events - NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required.");
  process.exit(1);
}
if (!process.env.TICKETMASTER_API_KEY) {
  console.log("ingest:events - no TICKETMASTER_API_KEY; skipping live ingest (seeded events remain).");
  process.exit(0);
}

const db = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });

// One fetch per city, keeping the call count tiny. The demo runs on Seattle; add more
// cities here only if you want them (each adds exactly one call per scheduled run).
const CITIES = [{ name: "Seattle", lat: 47.6062, lng: -122.3321, radiusMiles: 25 }];

async function main(): Promise<void> {
  let total = 0;
  for (const city of CITIES) {
    const { events, source } = await fetchNearbyEvents({
      lat: city.lat,
      lng: city.lng,
      radiusMiles: city.radiusMiles,
    });
    if (source !== "ticketmaster" || events.length === 0) {
      console.log(`ingest:events - ${city.name}: no live events (source=${source}); seeded events remain.`);
      continue;
    }
    const { error } = await db.from("events").upsert(events, { onConflict: "source,external_id" });
    if (error) throw error;
    total += events.length;
    console.log(`ingest:events - ${city.name}: upserted ${events.length} live Ticketmaster events.`);
  }
  console.log(`ingest:events - done (${total} live events; seeded events untouched).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
