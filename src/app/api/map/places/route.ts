import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { withNearestListingMinutes } from "@/lib/places/recurring";
import { demoRecurringPlaces } from "@/lib/demo";
import type { MapPlacesResponse } from "@/lib/contract";

export const dynamic = "force-dynamic";

// GET /api/map/places — life-map places (B9) + deterministic "N min from your usual
// coffee spot". Backed by the pre-loaded sample Takeout so the demo never breaks.
export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const places = demoRecurringPlaces();

    const supabase = await createServerSupabase();
    const { data: listings } = await supabase.from("listings").select("lat,lng").limit(500);

    const enriched = withNearestListingMinutes(places, listings ?? []);
    const body: MapPlacesResponse = { places: enriched };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/map/places failed:", err);
    return NextResponse.json({ error: "places_failed" }, { status: 500, headers: g.headers });
  }
}
