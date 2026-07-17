import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cost-of-living resolution for the finance model. Person B owns the `cost_of_living`
 * table (migration 0011) and this reader; Person C may later back a richer source with
 * the same table. 100 = national average. The constant map is a deterministic fallback
 * for fixture mode or an empty table so /api/finance never fails.
 */
export type CostOfLiving = { city: string; index: number; medianRent: number };

export const NATIONAL_COL: CostOfLiving = { city: "National", index: 100, medianRent: 1450 };

export const DEFAULT_COST_OF_LIVING: Record<string, CostOfLiving> = {
  seattle: { city: "Seattle", index: 152, medianRent: 2100 },
  "san francisco": { city: "San Francisco", index: 178, medianRent: 2900 },
  austin: { city: "Austin", index: 103, medianRent: 1650 },
  "new york": { city: "New York", index: 187, medianRent: 3200 },
  national: NATIONAL_COL,
};

/** Deterministic constant lookup (no DB). Falls back to the national average. */
export function costOfLivingFor(city: string | null | undefined): CostOfLiving {
  if (!city) return NATIONAL_COL;
  return DEFAULT_COST_OF_LIVING[city.trim().toLowerCase()] ?? NATIONAL_COL;
}

/** DB-backed lookup with the constant map as a fallback. */
export async function resolveCostOfLiving(
  db: SupabaseClient,
  city: string | null | undefined,
): Promise<CostOfLiving> {
  if (!city) return NATIONAL_COL;
  try {
    const { data } = await db
      .from("cost_of_living")
      .select("city,index,median_rent")
      .ilike("city", city.trim())
      .maybeSingle();
    if (data) {
      return { city: data.city, index: Number(data.index), medianRent: Number(data.median_rent) };
    }
  } catch {
    // fall through to the constant map
  }
  return costOfLivingFor(city);
}
