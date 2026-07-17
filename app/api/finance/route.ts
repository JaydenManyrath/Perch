import { NextRequest, NextResponse } from "next/server";
import { guard } from "@/lib/http";
import { buildFinanceBreakdown } from "@/lib/finance/model";
import { resolveCostOfLiving } from "@/lib/finance/colLookup";
import { resolveCanonicalFinance } from "@/lib/finance/canonical";
import { createServerSupabase } from "@/lib/supabase/server";
import type { FinanceBreakdown } from "@/lib/types/contract";

export const dynamic = "force-dynamic";

function numParam(req: NextRequest, key: string): number | null {
  const raw = req.nextUrl.searchParams.get(key);
  if (raw == null || raw.trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/**
 * GET /api/finance (RB34) - the deterministic FinanceBreakdown. Inputs resolve from the
 * caller's persisted offer (users.offer_salary / relocation_stipend / signing_bonus and
 * users.city), overridable by query params (salary, city, stipend, bonus, rent) for the
 * onboarding preview. Cost-of-living comes from the cost_of_living table. No model here.
 */
export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g instanceof NextResponse) return g;

  try {
    const supabase = await createServerSupabase();
    const monthlyRent = numParam(req, "rent");
    const hasPreviewOverride = ["salary", "city", "stipend", "bonus"].some((key) =>
      req.nextUrl.searchParams.has(key),
    );

    let body: FinanceBreakdown;
    if (hasPreviewOverride) {
      const { data: me, error: meError } = await supabase
        .from("users")
        .select("city,offer_salary,relocation_stipend,signing_bonus")
        .eq("id", g.callerId)
        .maybeSingle();
      if (meError) throw meError;

      const city = req.nextUrl.searchParams.get("city") ?? me?.city ?? "National";
      const salary = numParam(req, "salary") ?? (me?.offer_salary ?? null);
      const relocationStipend = numParam(req, "stipend") ?? me?.relocation_stipend ?? 0;
      const signingBonus = numParam(req, "bonus") ?? me?.signing_bonus ?? 0;
      const col = await resolveCostOfLiving(supabase, city);
      body = buildFinanceBreakdown({
        salary,
        city: col.city,
        costOfLivingIndex: col.index,
        medianRent: col.medianRent,
        relocationStipend,
        signingBonus,
        monthlyRent,
      });
    } else {
      body = (await resolveCanonicalFinance(supabase, g.callerId, monthlyRent)).breakdown;
    }
    return NextResponse.json(body, { headers: g.headers });
  } catch (err) {
    console.error("GET /api/finance failed:", err);
    return NextResponse.json({ error: "finance_failed" }, { status: 500, headers: g.headers });
  }
}
