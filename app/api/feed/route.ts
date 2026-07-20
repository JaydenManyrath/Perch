import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { rankFeed, type EventRow } from "@/lib/scoring/feed";
import { resolveEventArea } from "@/lib/events/area";
import { maybeRefreshCity } from "@/lib/events/ingest";
import { isTicketmasterEnabled } from "@/lib/events/ticketmaster";
import { haversineMeters } from "@/lib/places/distance";
import type { FeedResponse, TasteProfile } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

const METERS_PER_MILE = 1609.34;

// GET /api/feed?limit=20&city=Seattle - taste-ranked events (B7), scoped to the
// viewer's area: the city they selected in onboarding (users.city), overridable
// via ?city=. Deterministic ranking; Ticketmaster freshness via the same
// cooldown-gated background refresh the nearby route uses (RB52).
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const cityParam = req.nextUrl.searchParams.get("city");

  try {
    const supabase = await createServerSupabase();
    const { data: me } = await supabase
      .from("users")
      .select("taste_profile,city")
      .eq("id", g.callerId)
      .single();

    // The viewer's area: explicit ?city= wins, else the onboarding city, else Seattle.
    const area = await resolveEventArea(cityParam ?? me?.city ?? null);

    // Keep the viewer's area live between daily cron runs: kick the cooldown-gated
    // background ingest for THIS city (at most once per cooldown, concurrent requests
    // collapse onto one refresh, failures are swallowed). Fire-and-forget - never
    // blocks or fails the feed response.
    if (isTicketmasterEnabled()) {
      void maybeRefreshCity(createAdminClient, area);
    }

    // RB36 - upcoming events only (contract 13.1): guard datetime >= now in-query,
    // ordered soonest-first, even though Person C also filters at the Ticketmaster source.
    const q = supabase
      .from("events")
      .select("id,title,category,lat,lng,datetime,source,venue,url,image_url,price_range")
      .gte("datetime", new Date().toISOString())
      .order("datetime", { ascending: true });
    const { data: events } = await q.limit(200);

    const allRows = (events ?? []) as EventRow[];
    // Serve the viewer's area: events within the city radius. If nothing is within
    // range (e.g. a city we have no data for yet), fall back to everything upcoming -
    // the feed must never render empty because of a filter.
    const inArea = allRows.filter(
      (event) =>
        event.lat != null &&
        event.lng != null &&
        haversineMeters({ lat: area.lat, lng: area.lng }, { lat: event.lat, lng: event.lng }) <=
          area.radiusMiles * METERS_PER_MILE,
    );
    const eventRows = inArea.length > 0 ? inArea : allRows;
    const eventIds = eventRows.map((event) => event.id);
    const { data: viewerRows, error: viewerRowsError } = eventIds.length
      ? await supabase.from("event_attendance").select("event_id").in("event_id", eventIds).eq("user_id", g.callerId)
      : { data: [], error: null };
    if (viewerRowsError) throw viewerRowsError;
    const viewerGoingIds = new Set((viewerRows ?? []).map((row: { event_id: string }) => row.event_id));
    const attendanceByEventId = new Map(
      await Promise.all(
        eventIds.map(async (eventId) => {
          const { data, error } = await supabase.rpc("event_attendance_count", { event: eventId });
          if (error) throw error;
          return [
            eventId,
            {
              internsGoing: Number(data ?? 0),
              viewerGoing: viewerGoingIds.has(eventId),
            },
          ] as const;
        }),
      ),
    );

    const taste = (me?.taste_profile ?? {}) as TasteProfile;
    const items = rankFeed(taste, eventRows, { limit, attendanceByEventId });
    const body: FeedResponse = { items };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/feed failed:", err);
    return NextResponse.json({ error: "feed_failed" }, { status: 500, headers: g.headers });
  }
}
