import { NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { beginSpotifyConnect } from "@/lib/composio/spotify";
import type { SpotifyConnectResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// POST /api/composio/spotify/connect - begin read-only Spotify connect (B5). A12
// opens/redirects to redirectUrl. Read-only scopes only (no playback/write).
export async function POST(req: Request) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { redirectUrl } = await beginSpotifyConnect(g.callerId);
    const body: SpotifyConnectResponse = { redirectUrl };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("POST /api/composio/spotify/connect failed:", err);
    return NextResponse.json({ error: "connect_failed" }, { status: 500, headers: g.headers });
  }
}
