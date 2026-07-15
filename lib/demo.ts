import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parseTakeout } from "@/lib/parsers/takeout";
import type { Place } from "@/lib/types/contract";

/**
 * Demo-safe data: the pre-loaded sample Takeout backs the life-map + itinerary so
 * they never depend on a live upload (plan §7). In production these come from the
 * caller's stored `takeout` upload; for the demo we read the committed fixture.
 */
export function demoRecurringPlaces(): Place[] {
  const raw = readFileSync(
    join(process.cwd(), "scripts", "fixtures", "sample-takeout.json"),
    "utf8",
  );
  return parseTakeout(JSON.parse(raw));
}
