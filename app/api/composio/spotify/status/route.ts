import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { createAdminClient } from "@/lib/supabase/admin";
import { isComposioEnabled, fallbackTaste } from "@/lib/composio/spotify";
import type { SpotifyStatusResponse, TasteProfile } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

// GET /api/composio/spotify/status — poll connection + resulting taste (B5). When
// Composio is disabled or a demo connect completed, the fixture taste vector is used
// so taste_profile is always populated (fallback path, plan §6 Phase 6).
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  const demo = req.nextUrl.searchParams.get("demo") === "1";

  try {
    let connected = false;
    let taste: TasteProfile | null = null;

    if (!isComposioEnabled() || demo) {
      // Fallback / dev-demo path: populate from the fixture taste vector.
      taste = fallbackTaste();
      connected = true;
    } else {
      // Live path would fetch the connected account's top items here and normalize
      // via toTasteProfile(); best-effort until a real Composio key + account exist.
      connected = false;
      taste = null;
    }

    // Persist the taste to the caller's own row (best-effort; never blocks the poll).
    if (taste) {
      try {
        const admin = createAdminClient();
        await admin.from("users").update({ taste_profile: taste }).eq("id", g.callerId);
      } catch (persistErr) {
        console.warn("taste persist skipped:", persistErr);
      }
    }

    const body: SpotifyStatusResponse = { connected, taste };
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/composio/spotify/status failed:", err);
    return NextResponse.json({ error: "status_failed" }, { status: 500, headers: g.headers });
  }
}
