import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { rankMatches, type UserRow } from "@/lib/scoring/match";
import { polishReason } from "@/lib/llm/openai";
import type { MatchesResponse } from "@/lib/contract";

export const dynamic = "force-dynamic";

// GET /api/matches?limit=20 — ranked flock (B7/B11, connection-hero back half).
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const limit = Number(req.nextUrl.searchParams.get("limit") ?? 20);

  try {
    const supabase = await createServerSupabase();
    const cols = "id,name,role,city,company,move_in_date,taste_profile,verified,avatar_url";

    const { data: me } = await supabase.from("users").select(cols).eq("id", g.callerId).single();
    if (!me) {
      return NextResponse.json({ matches: [] } satisfies MatchesResponse, { headers: g.headers });
    }
    const { data: candidates } = await supabase
      .from("users")
      .select(cols)
      .neq("id", g.callerId)
      .limit(200);

    let matches = rankMatches(me as UserRow, (candidates ?? []) as UserRow[], { limit });

    // Optional LLM polish of the reason chips into one friendly sentence (additive).
    matches = await Promise.all(
      matches.map(async (m) => {
        const polished = await polishReason(m.reasons);
        return polished ? { ...m, reasons: [polished, ...m.reasons] } : m;
      }),
    );

    const body: MatchesResponse = { matches };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/matches failed:", err);
    return NextResponse.json({ error: "matches_failed" }, { status: 500, headers: g.headers });
  }
}
