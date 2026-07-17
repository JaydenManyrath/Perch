import type { SupabaseClient } from "@supabase/supabase-js";
import { buildFinanceBreakdown } from "@/lib/finance/model";
import { resolveCostOfLiving } from "@/lib/finance/colLookup";
import type { FinanceBreakdown } from "@/lib/types/contract";

type UserFinanceRow = {
  city: string | null;
  offer_salary: number | null;
  relocation_stipend: number | null;
  signing_bonus: number | null;
};

export type CanonicalFinance = {
  breakdown: FinanceBreakdown;
  hasParsedSalary: boolean;
};

/** Resolve the caller's persisted finance inputs through the canonical COL-backed model. */
export async function resolveCanonicalFinance(
  db: SupabaseClient,
  callerId: string,
  monthlyRent?: number | null,
): Promise<CanonicalFinance> {
  const { data: me, error: meError } = await db
    .from("users")
    .select("city,offer_salary,relocation_stipend,signing_bonus")
    .eq("id", callerId)
    .maybeSingle();
  if (meError) throw meError;

  const row = (me ?? null) as UserFinanceRow | null;
  const city = row?.city ?? "National";
  const col = await resolveCostOfLiving(db, city);
  const breakdown = buildFinanceBreakdown({
    salary: row?.offer_salary ?? null,
    city: col.city,
    costOfLivingIndex: col.index,
    medianRent: col.medianRent,
    relocationStipend: row?.relocation_stipend ?? 0,
    signingBonus: row?.signing_bonus ?? 0,
    monthlyRent,
  });

  return {
    breakdown,
    hasParsedSalary: breakdown.salary != null,
  };
}
