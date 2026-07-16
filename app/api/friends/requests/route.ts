import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { listIncomingFriendRequests } from "@/lib/friends";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = await createServerSupabase();
    return NextResponse.json(await listIncomingFriendRequests(supabase, g.callerId), { headers: g.headers });
  } catch (err) {
    console.error("GET /api/friends/requests failed:", err);
    return NextResponse.json({ error: "friend_requests_failed" }, { status: 500, headers: g.headers });
  }
}
