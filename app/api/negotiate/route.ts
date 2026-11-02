import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { resolveCanonicalFinance } from "@/lib/finance/canonical";
import { negotiationStream, toNdjsonStream } from "@/lib/negotiate/stream";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";
import type { FinanceBreakdown } from "@/lib/types/contract";
import { env, hasSupabase } from "@/lib/env";
import { rateLimit, rateHeaders } from "@/lib/llm/ratelimit";
import * as fx from "@/lib/fixtures";

export const dynamic = "force-dynamic";

// A real calendar date in YYYY-MM-DD form (rejects "June 8" and 2026-13-40).
const IsoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => new Date(`${v}T00:00:00Z`).toISOString().startsWith(v), "invalid date");

const RequestSchema = z.object({
  listingIds: z.array(z.string()).min(1).max(20),
  constraints: z
    .object({
      monthlyBudget: z.number().positive(),
      moveIn: IsoDate,
      moveOut: IsoDate,
      routineAnchors: z
        .array(z.object({ label: z.string(), lat: z.number(), lng: z.number() }))
        .optional(),
    })
    .refine((c) => c.moveIn <= c.moveOut, "moveOut must not be before moveIn"),
});

const NDJSON_HEADERS = {
  "Content-Type": "application/x-ndjson; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "X-Accel-Buffering": "no",
};

function scoutConstraints(
  stated: z.infer<typeof RequestSchema>["constraints"],
  finance: FinanceBreakdown,
): ScoutConstraints {
  // The stated budget always applies; with a parsed salary the budget scout also caps
  // it at the canonical COL-adjusted ceiling (affordableRent = min of the two).
  return {
    monthlyBudget: finance.salary != null ? Math.min(stated.monthlyBudget, finance.monthlyBudget) : stated.monthlyBudget,
    moveIn: stated.moveIn,
    moveOut: stated.moveOut,
    salary: finance.salary,
    costOfLivingIndex: finance.costOfLivingIndex,
    routineAnchors: stated.routineAnchors,
  };
}

/**
 * Fixture mode (the default, or live mode with no Supabase keys): the page sends fixture
 * listing ids and there may be no session to authenticate, so score
 * the fixture listings for the fixture user, like every other data getter does (D15).
 * Still rate limited per IP.
 */
async function fixtureNegotiate(req: Request): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const rl = rateLimit(`negotiate-fixture:${ip}`);
  const headers = rateHeaders(rl);
  if (!rl.ok) return NextResponse.json({ error: "rate_limited", retryAfterSec: rl.retryAfterSec }, { status: 429, headers });
  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers });
  }
  const byId = new Map(fx.listingsFixture.map((l) => [l.id, l]));
  const listings: ScoutListing[] = parsed.listingIds
    .map((id) => byId.get(id))
    .filter((l): l is NonNullable<typeof l> => !!l)
    .map((l) => ({
      id: l.id,
      title: l.title,
      price: l.price,
      lat: l.lat,
      lng: l.lng,
      lease_start: l.lease_start ?? null,
      lease_end: l.lease_end ?? null,
      safety_flags: l.safety_flags ?? { scamSignals: [], notes: [] },
    }));
  const finance = fx.buildFinanceBreakdown(fx.offerParseFixture);
  const stream = toNdjsonStream(negotiationStream(listings, scoutConstraints(parsed.constraints, finance)));
  return new Response(stream, { headers: { ...headers, ...NDJSON_HEADERS } });
}

// POST /api/negotiate - HERO streaming route (B10). Deterministic verdicts + numbers;
// LLM only narrates. Response is NDJSON: one NegotiateStreamEvent per line.
export async function POST(req: Request) {
  if (env.dataSource !== "live" || !hasSupabase()) return fixtureNegotiate(req);
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  let parsed;
  try {
    parsed = RequestSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400, headers: g.headers });
  }

  try {
    const supabase = await createServerSupabase();
    const finance = await resolveCanonicalFinance(supabase, g.callerId);
    const { data: rows } = await supabase
      .from("listings")
      .select("id,title,price,lat,lng,lease_start,lease_end,safety_flags")
      .in("id", parsed.listingIds);

    // Preserve the caller's requested order.
    const byId = new Map((rows ?? []).map((r) => [r.id, r]));
    const listings: ScoutListing[] = parsed.listingIds
      .map((id) => byId.get(id))
      .filter((r): r is NonNullable<typeof r> => !!r)
      .map((r) => ({
        id: r.id,
        title: r.title,
        price: r.price,
        lat: r.lat,
        lng: r.lng,
        lease_start: r.lease_start,
        lease_end: r.lease_end,
        safety_flags: r.safety_flags ?? { scamSignals: [], notes: [] },
      }));

    const constraints = scoutConstraints(parsed.constraints, finance.breakdown);

    const stream = toNdjsonStream(negotiationStream(listings, constraints));
    return new Response(stream, {
      headers: { ...g.headers, ...NDJSON_HEADERS },
    });
  } catch (err) {
    console.error("POST /api/negotiate failed:", err);
    return NextResponse.json({ error: "negotiate_failed" }, { status: 500, headers: g.headers });
  }
}
