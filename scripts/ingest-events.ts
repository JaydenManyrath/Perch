/**
 * Live event ingestion CLI (RB51 wrapper). Thin shell over the shared core in
 * lib/events/ingest.ts - the SAME logic the deployed app runs from its cron route and its
 * on-request refresh. Pulls real upcoming Ticketmaster events into the `events` table so
 * the Flyway feed shows ACTUAL events alongside the seeded base.
 *
 * Rate-limit conscious: one Ticketmaster call per city per run, nowhere near the Discovery
 * API's free-tier limits. Idempotent: upserts on the unique (source, external_id), so real
 * events never duplicate and never collide with the seeded rows (source='seeded').
 *
 * Skips cleanly (no error) when TICKETMASTER_API_KEY is absent - fetchNearbyEvents returns
 * the seeded fallback, the core writes nothing, and the seeded events remain. Safe to run
 * in any pipeline.
 *
 * Run:  npm run ingest:events   (needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY,
 *                                and TICKETMASTER_API_KEY for live data)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { ingestEvents } from "../lib/events/ingest";

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

async function main(): Promise<void> {
  const { cities, totalUpserted } = await ingestEvents(db);
  for (const c of cities) {
    if (c.source === "ticketmaster") {
      console.log(`ingest:events - ${c.city}: upserted ${c.upserted} live Ticketmaster events.`);
    } else {
      console.log(`ingest:events - ${c.city}: no live events (seeded events remain).`);
    }
  }
  console.log(`ingest:events - done (${totalUpserted} live events; seeded events untouched).`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
