import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Cost-of-living resolution for the finance model. Person B owns the `cost_of_living`
 * table (migration 0011) and this reader. 100 = national average.
 *
 * Bundled fallback dataset provenance: maintainer-curated demo-city reference data,
 * aligned to the 0011 seed rows and reviewed for Round 3 demo budgeting as of
 * 2026-07-17. It is intentionally small and deterministic; a valid persisted row is
 * authoritative, and no external provider or API key is required.
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

const STATE_SUFFIXES = new Set([
  "al",
  "alabama",
  "ak",
  "alaska",
  "az",
  "arizona",
  "ar",
  "arkansas",
  "ca",
  "california",
  "co",
  "colorado",
  "ct",
  "connecticut",
  "de",
  "delaware",
  "fl",
  "florida",
  "ga",
  "georgia",
  "hi",
  "hawaii",
  "id",
  "idaho",
  "il",
  "illinois",
  "in",
  "indiana",
  "ia",
  "iowa",
  "ks",
  "kansas",
  "ky",
  "kentucky",
  "la",
  "louisiana",
  "me",
  "maine",
  "md",
  "maryland",
  "ma",
  "massachusetts",
  "mi",
  "michigan",
  "mn",
  "minnesota",
  "ms",
  "mississippi",
  "mo",
  "missouri",
  "mt",
  "montana",
  "ne",
  "nebraska",
  "nv",
  "nevada",
  "nh",
  "new hampshire",
  "nj",
  "new jersey",
  "nm",
  "new mexico",
  "ny",
  "new york",
  "nc",
  "north carolina",
  "nd",
  "north dakota",
  "oh",
  "ohio",
  "ok",
  "oklahoma",
  "or",
  "oregon",
  "pa",
  "pennsylvania",
  "ri",
  "rhode island",
  "sc",
  "south carolina",
  "sd",
  "south dakota",
  "tn",
  "tennessee",
  "tx",
  "texas",
  "ut",
  "utah",
  "vt",
  "vermont",
  "va",
  "virginia",
  "wa",
  "washington",
  "wv",
  "west virginia",
  "wi",
  "wisconsin",
  "wy",
  "wyoming",
]);

function canonicalCityKey(city: string | null | undefined): string | null {
  if (!city) return null;
  const cleaned = city
    .trim()
    .replace(/[.!?;:]+$/g, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
  if (!cleaned) return null;

  const [name, suffix] = cleaned.split(",").map((part) => part.trim());
  if (suffix && STATE_SUFFIXES.has(suffix)) return name || null;
  return cleaned;
}

function isValidCostOfLiving(value: CostOfLiving): boolean {
  return (
    value.city.trim().length > 0 &&
    Number.isFinite(value.index) &&
    value.index > 0 &&
    Number.isFinite(value.medianRent) &&
    value.medianRent >= 0
  );
}

/** Deterministic constant lookup (no DB). Falls back to the national average. */
export function costOfLivingFor(city: string | null | undefined): CostOfLiving {
  const key = canonicalCityKey(city);
  if (!key) return NATIONAL_COL;
  return DEFAULT_COST_OF_LIVING[key] ?? NATIONAL_COL;
}

/** DB-backed lookup with the constant map as a fallback. */
export async function resolveCostOfLiving(
  db: SupabaseClient,
  city: string | null | undefined,
): Promise<CostOfLiving> {
  const key = canonicalCityKey(city);
  if (!key) return NATIONAL_COL;
  const fallback = costOfLivingFor(city);
  try {
    const { data, error } = await db
      .from("cost_of_living")
      .select("city,index,median_rent")
      .ilike("city", key)
      .maybeSingle();
    if (error) return fallback;
    if (data) {
      const persisted = { city: data.city, index: Number(data.index), medianRent: Number(data.median_rent) };
      if (isValidCostOfLiving(persisted)) return persisted;
    }
  } catch {
    // fall through to the constant map
  }
  return fallback;
}
