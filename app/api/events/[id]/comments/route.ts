import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import type { EventComment, EventCommentsResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ id: string }> | { id: string };
};

type EventCommentRow = {
  id: string;
  event_id: string;
  body: string;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | { id: string; name: string; avatar_url: string | null }[] | null;
};

async function paramsId(ctx: RouteContext): Promise<string> {
  const params = await ctx.params;
  return params.id;
}

function toEventComment(row: EventCommentRow): EventComment {
  const author = Array.isArray(row.users) ? row.users[0] : row.users;
  return {
    id: row.id,
    eventId: row.event_id,
    author: {
      id: author?.id ?? "",
      name: author?.name ?? "",
      avatarUrl: author?.avatar_url ?? null,
    },
    body: row.body,
    createdAt: row.created_at,
  };
}

async function eventExists(supabase: Awaited<ReturnType<typeof createServerSupabase>>, eventId: string) {
  const { data, error } = await supabase.from("events").select("id").eq("id", eventId).maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

export async function GET(req: NextRequest, ctx: RouteContext) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const eventId = await paramsId(ctx);
  const supabase = await createServerSupabase();

  try {
    if (!(await eventExists(supabase, eventId))) {
      return NextResponse.json({ error: "event_not_found" }, { status: 404, headers: g.headers });
    }

    const { data, error } = await supabase
      .from("event_comments")
      .select("id,event_id,body,created_at,users:author_id(id,name,avatar_url)")
      .eq("event_id", eventId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });
    if (error) throw error;

    const response: EventCommentsResponse = {
      comments: ((data ?? []) as unknown as EventCommentRow[]).map(toEventComment),
    };
    return NextResponse.json(response, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/events/[id]/comments failed:", err);
    return NextResponse.json({ error: "event_comments_failed" }, { status: 500, headers: g.headers });
  }
}

export async function POST(req: NextRequest, ctx: RouteContext) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  let body: { body?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: g.headers });
  }

  const commentBody = typeof body.body === "string" ? body.body.trim() : "";
  if (commentBody.length === 0 || commentBody.length > 500) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400, headers: g.headers });
  }

  const eventId = await paramsId(ctx);
  const supabase = await createServerSupabase();

  try {
    const { data: me, error: meError } = await supabase.from("users").select("user_type").eq("id", g.callerId).single();
    if (meError) throw meError;
    if (me?.user_type !== "intern") {
      return NextResponse.json({ error: "intern_required" }, { status: 403, headers: g.headers });
    }

    if (!(await eventExists(supabase, eventId))) {
      return NextResponse.json({ error: "event_not_found" }, { status: 404, headers: g.headers });
    }

    const { data, error } = await supabase
      .from("event_comments")
      .insert({ event_id: eventId, author_id: g.callerId, body: commentBody })
      .select("id,event_id,body,created_at,users:author_id(id,name,avatar_url)")
      .single();
    if (error) throw error;

    return NextResponse.json(toEventComment(data as unknown as EventCommentRow), { status: 201, headers: g.headers });
  } catch (err) {
    console.error("POST /api/events/[id]/comments failed:", err);
    return NextResponse.json({ error: "event_comment_failed" }, { status: 500, headers: g.headers });
  }
}
