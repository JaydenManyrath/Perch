import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { declineFriendRequest, FriendForbiddenError } from "@/lib/friends";
import { createServerSupabase } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> | { id: string } };

export async function POST(req: Request, ctx: RouteContext) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { id } = await ctx.params;
    const supabase = await createServerSupabase();
    await declineFriendRequest(supabase, g.callerId, id);
    return new NextResponse(null, { status: 204, headers: g.headers });
  } catch (err) {
    if (err instanceof FriendForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403, headers: g.headers });
    }
    console.error("POST /api/friends/[id]/decline failed:", err);
    return NextResponse.json({ error: "friend_decline_failed" }, { status: 500, headers: g.headers });
  }
}
