import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ingestListings } from "@/lib/sourcing/ingest";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/admin/source-listings (RC1) - service-role trigger for the sourcing
 * ingest. Rate-limited. Gated by ADMIN_SECRET when set; in dev with no secret it is
 * allowed so the demo "refresh sourcing" action works. Idempotent via dedupe + the
 * unique (source_name, external_id) upsert conflict target.
 */
function adminAuthorized(req: Request): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production"; // demo: dev-only when unset
  return req.headers.get("x-admin-secret") === secret;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`source-listings:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429, headers });
  }
  if (!adminAuthorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  try {
    const admin = createAdminClient();
    const result = await ingestListings(admin, { city: "Seattle" });
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("POST /api/admin/source-listings failed:", err);
    return NextResponse.json({ error: "ingest_failed" }, { status: 500, headers });
  }
}
