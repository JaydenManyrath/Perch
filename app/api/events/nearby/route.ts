import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNearbyEvents } from "@/lib/events/ticketmaster";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/events/nearby?lat=&lng=&radius= (RC3) - Ticketmaster-sourced nearby events,
 * upserted into B's `events` (dedupe on unique (source, external_id)), with a seeded
 * fallback when there is no key/quota. Rate-limited via guard; the key stays
 * server-side. B's feed reads these; A renders them.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const lat = Number(req.nextUrl.searchParams.get("lat") ?? 47.6062);
  const lng = Number(req.nextUrl.searchParams.get("lng") ?? -122.3321);
  const radius = Number(req.nextUrl.searchParams.get("radius") ?? 25);

  try {
    const { events, source } = await fetchNearbyEvents({ lat, lng, radiusMiles: radius });

    // Best-effort upsert into B's events table; never block the response on it.
    try {
      const admin = createAdminClient();
      await admin.from("events").upsert(events, { onConflict: "source,external_id" });
    } catch (dbErr) {
      console.warn("events upsert skipped:", dbErr);
    }

    // RB36 - upcoming only (contract 13.1): guard datetime >= now as defense in depth
    // and sort soonest-first, regardless of what the source returned.
    const nowMs = Date.now();
    const upcoming = events
      .filter((e) => Date.parse(e.datetime) >= nowMs)
      .sort((a, b) => Date.parse(a.datetime) - Date.parse(b.datetime));

    return NextResponse.json({ events: upcoming, source }, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/events/nearby failed:", err);
    return NextResponse.json({ error: "events_failed" }, { status: 500, headers: g.headers });
  }
}
