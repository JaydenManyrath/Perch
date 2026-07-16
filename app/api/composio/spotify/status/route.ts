import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { readSpotifyTaste } from "@/lib/composio/spotify";
import type { SpotifyStatusResponse } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/composio/spotify/status - poll connection + resulting taste (B5). When
// Composio is disabled or a demo connect completed, the fixture taste vector is used
// so taste_profile is always populated (fallback path, plan section 6 Phase 6).
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const { connected, taste } = await readSpotifyTaste(g.callerId);

    // Persist the taste to the caller's own row (best-effort; never blocks the poll).
    if (taste) {
      const admin = createAdminClient();
      const { error } = await admin.from("users").update({ taste_profile: taste }).eq("id", g.callerId);
      if (error) throw error;
    }

    const body: SpotifyStatusResponse = { connected, taste };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/composio/spotify/status failed:", err);
    return NextResponse.json({ error: "status_failed" }, { status: 500, headers: g.headers });
  }
}
