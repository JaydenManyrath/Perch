import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { rankFeed, type EventRow } from "@/lib/scoring/feed";
import type { FeedResponse, TasteProfile } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/feed?limit=20&city=Seattle — taste-ranked events (B7). Deterministic.
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

    let q = supabase.from("events").select("id,title,category,lat,lng,datetime,source");
    if (city) q = q.ilike("title", `%${city}%`);
    const { data: events } = await q.limit(200);

    const taste = (me?.taste_profile ?? {}) as TasteProfile;
    const items = rankFeed(taste, (events ?? []) as EventRow[], { limit });
    const body: FeedResponse = { items };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/feed failed:", err);
    return NextResponse.json({ error: "feed_failed" }, { status: 500, headers: g.headers });
  }
}
