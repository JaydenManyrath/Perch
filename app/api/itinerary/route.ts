import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { buildItinerary } from "@/lib/itinerary/plan";
import { demoRecurringPlaces } from "@/lib/demo";
import type { ItineraryResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/itinerary?days=7 — first-week plan (B8). Deterministic day scaffold; the
// LLM may only fill per-item prose (degrades to deterministic notes). Calendar sync
// is optional and never blocks the response.
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const days = Math.min(14, Math.max(1, Number(req.nextUrl.searchParams.get("days") ?? 7)));

  try {
    const supabase = await createServerSupabase();
    const { data: me } = await supabase
      .from("users")
      .select("city,move_in_date")
      .eq("id", g.callerId)
      .single();

    const moveInDate = me?.move_in_date ?? new Date().toISOString().slice(0, 10);
    const city = me?.city ?? "your new city";

    const landingWeek = buildItinerary({
      moveInDate,
      city,
      days,
      places: demoRecurringPlaces(),
    });

    const body: ItineraryResponse = { landingWeek, calendarSynced: false };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/itinerary failed:", err);
    return NextResponse.json({ error: "itinerary_failed" }, { status: 500, headers: g.headers });
  }
}
