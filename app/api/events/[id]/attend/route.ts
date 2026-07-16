import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import type { AttendInput, AttendResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

async function paramsId(ctx: RouteContext): Promise<string> {
  const params = await ctx.params;
  return params.id;
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  let body: Partial<AttendInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: g.headers });
  }

  if (typeof body.going !== "boolean") {
    return NextResponse.json({ error: "invalid_going" }, { status: 400, headers: g.headers });
  }

  const eventId = await paramsId(ctx);
  const supabase = await createServerSupabase();

  try {
    const { data: me, error: meError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", g.callerId)
      .single();
    if (meError) throw meError;
    if (me?.user_type !== "intern") {
      return NextResponse.json({ error: "intern_required" }, { status: 403, headers: g.headers });
    }

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!event) {
      return NextResponse.json({ error: "event_not_found" }, { status: 404, headers: g.headers });
    }

    if (body.going) {
      const { error } = await supabase
        .from("event_attendance")
        .upsert({ event_id: eventId, user_id: g.callerId }, { onConflict: "event_id,user_id" });
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from("event_attendance")
        .delete()
        .eq("event_id", eventId)
        .eq("user_id", g.callerId);
      if (error) throw error;
    }

    const { data: going, error: countError } = await supabase.rpc("event_attendance_count", {
      event: eventId,
    });
    if (countError) throw countError;

    const response: AttendResponse = {
      going: Number(going ?? 0),
      viewerGoing: body.going,
    };
    return NextResponse.json(response, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/events/[id]/attend failed:", err);
    return NextResponse.json({ error: "attend_failed" }, { status: 500, headers: g.headers });
  }
}
