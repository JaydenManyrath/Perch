import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import type { MapComment, MapCommentsResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

type NoteMapCommentRow = {
  id: string;
  lat: number;
  lng: number;
  topic: string;
  body: string;
  created_at: string;
  users: { id: string; name: string; avatar_url: string | null } | null;
};

class MapCommentInputError extends Error {}

function parseCoordinate(value: unknown, label: string, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new MapCommentInputError(`invalid_${label}`);
  }
  return value;
}

function parseText(value: unknown, label: string): string {
  if (typeof value !== "string") throw new MapCommentInputError(`invalid_${label}`);
  const trimmed = value.trim();
  if (!trimmed) throw new MapCommentInputError(`invalid_${label}`);
  return trimmed;
}

function parseBbox(value: string | null) {
  if (!value) throw new MapCommentInputError("invalid_bbox");
  const parts = value.split(",");
  if (parts.length !== 4) throw new MapCommentInputError("invalid_bbox");
  if (parts.some((part) => part.trim() === "")) throw new MapCommentInputError("invalid_bbox");

  const [minLng, minLat, maxLng, maxLat] = parts.map((part) => Number(part));
  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    throw new MapCommentInputError("invalid_bbox");
  }
  if (minLng < -180 || maxLng > 180 || minLat < -90 || maxLat > 90) {
    throw new MapCommentInputError("invalid_bbox");
  }
  if (minLng > maxLng || minLat > maxLat) {
    throw new MapCommentInputError("invalid_bbox");
  }

  return { minLng, minLat, maxLng, maxLat };
}

function mapRow(row: NoteMapCommentRow): MapComment {
  if (!row.users) throw new Error("map_comment_author_missing");

  return {
    id: row.id,
    author: {
      id: row.users.id,
      name: row.users.name,
      avatarUrl: row.users.avatar_url,
    },
    lat: row.lat,
    lng: row.lng,
    topic: row.topic,
    body: row.body,
    createdAt: row.created_at,
  };
}

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { minLng, minLat, maxLng, maxLat } = parseBbox(req.nextUrl.searchParams.get("bbox"));
    const supabase = await createServerSupabase();
    const { data, error } = await supabase
      .from("notes")
      .select("id,lat,lng,topic,body,created_at,users:created_by(id,name,avatar_url)")
      .not("lat", "is", null)
      .not("lng", "is", null)
      .gte("lng", minLng)
      .lte("lng", maxLng)
      .gte("lat", minLat)
      .lte("lat", maxLat)
      .order("created_at", { ascending: false })
      .order("id", { ascending: true });
    if (error) throw error;

    const body: MapCommentsResponse = { comments: ((data ?? []) as unknown as NoteMapCommentRow[]).map(mapRow) };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    if (err instanceof MapCommentInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("GET /api/map/comments failed:", err);
    return NextResponse.json({ error: "map_comments_failed" }, { status: 500, headers: g.headers });
  }
}

export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const payload = await req.json();
    const lat = parseCoordinate(payload?.lat, "lat", -90, 90);
    const lng = parseCoordinate(payload?.lng, "lng", -180, 180);
    const topic = parseText(payload?.topic, "topic");
    const bodyText = parseText(payload?.body, "body");
    if ("created_by" in payload || "author" in payload || "author_id" in payload) {
      throw new MapCommentInputError("forged_author");
    }

    const supabase = await createServerSupabase();
    const { data: me, error: meError } = await supabase
      .from("users")
      .select("user_type")
      .eq("id", g.callerId)
      .single();
    if (meError) throw meError;
    if (me?.user_type !== "intern") {
      return NextResponse.json({ error: "interns_only" }, { status: 403, headers: g.headers });
    }

    const { data, error } = await supabase
      .from("notes")
      .insert({
        city: null,
        lat,
        lng,
        topic,
        body: bodyText,
        created_by: g.callerId,
      })
      .select("id,lat,lng,topic,body,created_at,users:created_by(id,name,avatar_url)")
      .single();
    if (error) throw error;

    return NextResponse.json(mapRow(data as unknown as NoteMapCommentRow), { status: 201, headers: g.headers });
  } catch (err) {
    if (err instanceof MapCommentInputError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: g.headers });
    }
    console.error("POST /api/map/comments failed:", err);
    return NextResponse.json({ error: "map_comment_create_failed" }, { status: 500, headers: g.headers });
  }
}
