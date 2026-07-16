import { NextResponse } from "next/server";
import { z } from "zod";
import { guard } from "@/lib/http";
import { createServerSupabase } from "@/lib/supabase/server";
import { negotiationStream, toNdjsonStream } from "@/lib/negotiate/stream";
import type { ScoutListing, ScoutConstraints } from "@/lib/negotiate/types";

export const dynamic = "force-dynamic";

const RequestSchema = z.object({
  listingIds: z.array(z.string()).min(1).max(20),
  constraints: z.object({
    monthlyBudget: z.number().positive(),
    moveIn: z.string(),
    moveOut: z.string(),
    routineAnchors: z
      .array(z.object({ label: z.string(), lat: z.number(), lng: z.number() }))
      .optional(),
  }),
});

// POST /api/negotiate - HERO streaming route (B10). Deterministic verdicts + numbers;
// LLM only narrates. Response is NDJSON: one NegotiateStreamEvent per line.
export async function POST(req: Request) {
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

    const constraints: ScoutConstraints = {
      monthlyBudget: parsed.constraints.monthlyBudget,
      moveIn: parsed.constraints.moveIn,
      moveOut: parsed.constraints.moveOut,
      routineAnchors: parsed.constraints.routineAnchors,
    };

    const stream = toNdjsonStream(negotiationStream(listings, constraints));
    return new Response(stream, {
      headers: {
        ...g.headers,
        "Content-Type": "application/x-ndjson; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (err) {
    console.error("POST /api/negotiate failed:", err);
    return NextResponse.json({ error: "negotiate_failed" }, { status: 500, headers: g.headers });
  }
}
