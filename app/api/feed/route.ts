import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { rankFeed, type EventRow } from "@/lib/scoring/feed";
import type { FeedResponse, TasteProfile } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/feed?limit=20&city=Seattle - taste-ranked events (B7). Deterministic.
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);
  const city = req.nextUrl.searchParams.get("city");

  try {
    const supabase = await createServerSupabase();
    const { data: me } = await supabase
      .from("users")
      .select("taste_profile")
      .eq("id", g.callerId)
      .single();

    // RB36 - upcoming events only (contract 13.1): guard datetime >= now in-query,
    // ordered soonest-first, even though Person C also filters at the Ticketmaster source.
    let q = supabase
      .from("events")
      .select("id,title,category,lat,lng,datetime,source,venue,url,image_url,price_range")
      .gte("datetime", new Date().toISOString())
      .order("datetime", { ascending: true });
    if (city) q = q.ilike("title", `%${city}%`);
    const { data: events } = await q.limit(200);

    const eventRows = (events ?? []) as EventRow[];
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
