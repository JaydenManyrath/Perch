import type { Verdict } from "@/lib/contract";
import type { ScoutListing, ScoutConstraints, ScoutResult } from "./types";
import { budgetScout } from "./budget";
import { safetyScout } from "./safety";
import { leaseScout } from "./lease";
import { routineScout } from "./routine";

/**
 * Run all four deterministic scouts in the frozen contract order:
 * budget → safety → lease_fit → routine_fit.
 */
export function runScouts(
  listing: ScoutListing,
  constraints: ScoutConstraints,
): ScoutResult[] {
  return [
    budgetScout(listing, constraints),
    safetyScout(listing),
    leaseScout(listing, constraints),
    routineScout(listing, constraints),
  ];
}

/**
 * Deterministic overall roll-up (contract §4.3 ordering guarantee):
 *   any `fail` → fail; else any `flag` → flag; else pass.
 * Counting is done in code — never by the model.
 */
export function aggregate(results: ScoutResult[]): {
  overall: Verdict;
  passedChecks: number;
  totalChecks: number;
} {
  const totalChecks = results.length;
  const passedChecks = results.filter((r) => r.verdict === "pass").length;
  const hasFail = results.some((r) => r.verdict === "fail");
  const hasFlag = results.some((r) => r.verdict === "flag");
  const overall: Verdict = hasFail ? "fail" : hasFlag ? "flag" : "pass";
  return { overall, passedChecks, totalChecks };
}

/**
 * Deterministic ranking for the results screen (contract §4.3): sort by overall
 * (pass < flag < fail is best→worst), then more passed checks first, tie-break by
 * listingId for stability.
 */
const OVERALL_RANK: Record<Verdict, number> = { pass: 0, flag: 1, fail: 2 };

export function rankSummaries<
  T extends { overall: Verdict; passedChecks: number; totalChecks: number; listingId: string },
>(summaries: T[]): T[] {
  return [...summaries].sort((a, b) => {
    if (OVERALL_RANK[a.overall] !== OVERALL_RANK[b.overall]) {
      return OVERALL_RANK[a.overall] - OVERALL_RANK[b.overall];
    }
    if (b.passedChecks !== a.passedChecks) return b.passedChecks - a.passedChecks;
    return a.listingId < b.listingId ? -1 : a.listingId > b.listingId ? 1 : 0;
  });
}
