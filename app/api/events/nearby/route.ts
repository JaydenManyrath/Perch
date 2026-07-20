import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchNearbyEvents, isTicketmasterEnabled } from "@/lib/events/ticketmaster";
import { maybeRefreshCity } from "@/lib/events/ingest";

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
      await admin.from("events").upsert(events, { onConflict: "id" });
    } catch (dbErr) {
      console.warn("events upsert skipped:", dbErr);
    }

    // RB52 - keep the events table live between daily cron runs. Under real traffic, kick
    // a background ingest for this city at most once per cooldown (default 6h), collapsing
    // concurrent requests onto one refresh. Fire-and-forget: never blocks or fails the
    // response. Only meaningful with a key; the no-key path stays a pure seeded fallback.
    // (Next 14 has no after()/waitUntil here, so this is best-effort - the synchronous
    // upsert above and the daily cron are what guarantee freshness.)
    if (isTicketmasterEnabled()) {
      void maybeRefreshCity(createAdminClient, { name: `${lat},${lng}`, lat, lng, radiusMiles: radius });
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
