import type { ScoutListing, ScoutConstraints, ScoutResult } from "./types";

const GAP_FLAG_DAYS = 7; // a gap this small is a flag, not a fail (thresholds in code)
const MS_PER_DAY = 86_400_000;

/** Whole-day difference (b - a) at UTC midnight, for ISO date strings. */
function dayDiff(aIso: string, bIso: string): number {
  const a = Date.parse(`${aIso}T00:00:00Z`);
  const b = Date.parse(`${bIso}T00:00:00Z`);
  return Math.round((b - a) / MS_PER_DAY);
}

/**
 * Lease-fit scout — pure date logic (plan §6.1). Does the listing's lease window
 * cover the intern's needed window [moveIn, moveOut]? `pass` if fully covered;
 * `flag` if it misses by a small total gap (≤ 7 days); `fail` otherwise (or if
 * dates are unknown).
 */
export function leaseScout(
  listing: ScoutListing,
  constraints: ScoutConstraints,
): ScoutResult {
  const { lease_start, lease_end } = listing;
  if (!lease_start || !lease_end) {
    return { check: "lease_fit", verdict: "fail", value: "Lease dates unknown" };
  }

  // Uncovered days at each end (0 when the lease covers that side).
  const uncoveredStart = Math.max(0, dayDiff(constraints.moveIn, lease_start)); // lease starts after you need it
  const uncoveredEnd = Math.max(0, dayDiff(lease_end, constraints.moveOut)); // you leave after the lease ends
  const gap = uncoveredStart + uncoveredEnd;

  if (gap === 0) {
    return {
      check: "lease_fit",
      verdict: "pass",
      value: "Covers your full internship",
    };
  }
  if (gap <= GAP_FLAG_DAYS) {
    return {
      check: "lease_fit",
      verdict: "flag",
      value: `Misses ${gap} day${gap === 1 ? "" : "s"} of your stay`,
    };
  }
  return {
    check: "lease_fit",
    verdict: "fail",
    value: `Gap of ${gap} days vs your stay`,
  };
}
