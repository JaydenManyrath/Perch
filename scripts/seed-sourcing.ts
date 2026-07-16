/**
 * RC5 - demo data via the pipeline. Idempotent. Fills the area with auto-sourced
 * listings (RC1 ingest), marks ONE near-expiry so the freshness ping + confirm flow
 * demos (RC2), and pre-loads Ticketmaster-shaped events near the demo user (RC3, live
 * when keyed else seeded fallback). Coordinate ids with B's base seed (this only writes
 * sourced listings + events, keyed on source_name/external_id, so it never collides).
 *
 * Run: npm run seed:sourcing   (requires .env.local with Supabase URL + service-role
 * key, and B's RB1 listings/events columns applied).
 */
import { config } from "dotenv";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestListings } from "@/lib/sourcing/ingest";
import { fetchNearbyEvents } from "@/lib/events/ticketmaster";

config({ path: ".env.local" });

const DAY = 86_400_000;
const SEATTLE = { lat: 47.6062, lng: -122.3321 };

async function main() {
  const admin = createAdminClient();

  // 1. Auto-sourced listings (idempotent via dedupe + unique (source_name, external_id)).
  const ingest = await ingestListings(admin, { city: "Seattle" });
  console.log("sourced listings:", ingest);

  // 2. One near-expiry sourced listing to demo the freshness ping + confirm-back flow.
  const soon = new Date(Date.now() + 1 * DAY).toISOString();
  const near = await admin
    .from("listings")
    .update({ expires_at: soon })
    .eq("source_name", "seed-adapter")
    .eq("external_id", "caphill-01");
  if (near.error) console.warn("near-expiry set skipped:", near.error.message);
  else console.log("marked caphill-01 as near-expiry (expires in ~1 day)");

  // 3. Ticketmaster-shaped events near the demo user (live when keyed, else fallback).
  const { events, source } = await fetchNearbyEvents({ ...SEATTLE, radiusMiles: 25 });
  const up = await admin.from("events").upsert(events, { onConflict: "source,external_id" });
  if (up.error) throw new Error(`events upsert failed: ${up.error.message}`);
  console.log(`events (${source}): ${events.length}`);

  console.log("\nRC5 sourcing seed complete (idempotent - safe to re-run).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
