import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFreshnessPass } from "@/lib/sourcing/freshness";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * POST /api/cron/expire-listings (RC2) - the freshness pass. Flips expired available
 * listings to stale and returns the near-expiry subletter ids to ping. Meant to run on
 * a schedule (Vercel Cron) or on demand for the demo. Service-role; rate-limited; gated
 * by CRON_SECRET when set (dev-only when unset).
 */
function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return process.env.NODE_ENV !== "production";
  return req.headers.get("x-cron-secret") === secret;
}

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`expire-listings:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429, headers });
  }
  if (!authorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  try {
    const admin = createAdminClient();
    const result = await runFreshnessPass(admin);
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("POST /api/cron/expire-listings failed:", err);
    return NextResponse.json({ error: "freshness_failed" }, { status: 500, headers });
  }
}
