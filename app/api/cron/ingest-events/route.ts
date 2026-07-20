import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isCronAuthorized } from "@/lib/cron/auth";
import { ingestEvents } from "@/lib/events/ingest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/cron/ingest-events (RB51) - scheduled Ticketmaster ingest. Vercel Cron hits
 * this daily (see vercel.json) and, when CRON_SECRET is set on the project, sends
 * `Authorization: Bearer ${CRON_SECRET}` automatically; any other caller gets 401.
 * Idempotent: ingestEvents upserts on the unique (source, external_id), so re-runs add
 * zero rows and never disturb the seeded base. Missing TICKETMASTER_API_KEY is a clean
 * no-op (the seeded events remain), never a crash.
 */
export async function GET(req: Request) {
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const result = await ingestEvents(createAdminClient());
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("GET /api/cron/ingest-events failed:", err);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500 });
  }
}
