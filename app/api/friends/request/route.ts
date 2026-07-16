import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { FriendForbiddenError, FriendInputError, parseFriendTargetId, requestFriend } from "@/lib/friends";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const body = await req.json();
    const targetId = parseFriendTargetId(body?.userId);
    const supabase = await createServerSupabase();
    return NextResponse.json(await requestFriend(supabase, g.callerId, targetId), { headers: g.headers });
  } catch (err) {
    if (err instanceof SyntaxError || err instanceof FriendInputError) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "invalid_json" }, { status: 400, headers: g.headers });
    }
    if (err instanceof FriendForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403, headers: g.headers });
    }
    console.error("POST /api/friends/request failed:", err);
    return NextResponse.json({ error: "friend_request_failed" }, { status: 500, headers: g.headers });
  }
}
