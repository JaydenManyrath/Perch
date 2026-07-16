import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { FriendForbiddenError, listFriendNotes } from "@/lib/friends";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = createAdminClient();
    return NextResponse.json(await listFriendNotes(supabase, g.callerId), { headers: g.headers });
  } catch (err) {
    if (err instanceof FriendForbiddenError) {
      return NextResponse.json({ error: err.message }, { status: 403, headers: g.headers });
    }
    console.error("GET /api/friends/notes failed:", err);
    return NextResponse.json({ error: "friend_notes_failed" }, { status: 500, headers: g.headers });
  }
}
