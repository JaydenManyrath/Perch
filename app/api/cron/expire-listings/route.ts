import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runFreshnessPass } from "@/lib/sourcing/freshness";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";
import { isCronAuthorized } from "@/lib/cron/auth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * /api/cron/expire-listings (RC2) - the freshness pass. Flips expired available listings
 * to stale and returns the near-expiry subletter ids to ping. Service-role; rate-limited;
 * gated by CRON_SECRET (dev-open, prod-closed when unset).
 *
 * RB52: scheduled by vercel.json. Vercel Cron invokes with a GET and an
 * `Authorization: Bearer ${CRON_SECRET}` header, so this exposes GET. The original POST
 * (with the legacy `x-cron-secret` header) stays for on-demand demo calls - both share
 * one handler and the same shared cron authorization.
 */
async function handle(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`expire-listings:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429, headers });
  }
  if (!isCronAuthorized(req)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403, headers });
  }

  try {
    const admin = createAdminClient();
    const result = await runFreshnessPass(admin);
    return NextResponse.json(result, { headers });
  } catch (err) {
    console.error("cron/expire-listings failed:", err);
    return NextResponse.json({ error: "freshness_failed" }, { status: 500, headers });
  }
}

export const GET = handle; // Vercel Cron (GET + Authorization: Bearer)
export const POST = handle; // on-demand demo call (legacy x-cron-secret)
